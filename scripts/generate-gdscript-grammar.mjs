import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { arch, homedir, platform, tmpdir } from 'node:os'
import { delimiter, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const OUT_DIR = join(ROOT, 'internal', 'gdscript', 'grammar')
const PACKAGE = 'grammar'
const LANGUAGE_SYMBOL = 'tree_sitter_gdscript'
const GENERATOR = 'scripts/generate-gdscript-grammar.mjs'

const PINS_FILE = join(ROOT, 'scripts', 'gdscript-grammar.json')

const CLANG_FLAGS = [
  '--target=wasm32',
  '-ffreestanding',
  '-nostdlib',
  '-std=c11',
  '-g0',
  '-Oz',
  '-DNDEBUG',
  '-D__wasi__',
  '-Wall',
  '-Wextra',
  '-Wno-unused-parameter',
  '-Wno-unused-function',
  '-mexec-model=reactor',
  '-mmutable-globals',
  '-mmultivalue',
  '-mnontrapping-fptoint',
  '-msign-ext',
  '-mreference-types',
  '-mbulk-memory',
  '-mextended-const',
  '-mtail-call',
  '-Wl,--stack-first',
  '-Wl,--export-table',
  '-Wl,--import-memory',
  '-Wl,--import-undefined',
]

const WASM_OPT_FLAGS = [
  '--low-memory-unused',
  '--converge',
  '-O4',
  '--enable-mutable-globals',
  '--enable-multivalue',
  '--enable-nontrapping-float-to-int',
  '--enable-sign-ext',
  '--enable-reference-types',
  '--enable-bulk-memory',
  '--enable-extended-const',
  '--enable-tail-call',
  '--strip',
  '--strip-producers',
]

const cacheDir =
  process.env.OVERSEE_GRAMMAR_CACHE ??
  join(process.env.XDG_CACHE_HOME ?? join(homedir(), '.cache'), 'oversee', 'gdscript-grammar')

const run = (command, args, options = {}) => {
  return execFileSync(command, args, { encoding: 'utf8', maxBuffer: 1 << 28, ...options })
}

const sha256 = (file) => {
  return createHash('sha256').update(readFileSync(file)).digest('hex')
}

const download = async (url, file, digest) => {
  if (existsSync(file) && (!digest || sha256(file) === digest)) {
    return file
  }
  console.log(`download ${url}`)
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`${url}: ${response.status}`)
  }
  const partial = `${file}.partial`
  writeFileSync(partial, Buffer.from(await response.arrayBuffer()))
  if (digest && sha256(partial) !== digest) {
    rmSync(partial)
    throw new Error(`${url}: sha256 mismatch`)
  }
  renameSync(partial, file)
  return file
}

const unpack = (archive, dir, excludes = []) => {
  if (existsSync(dir)) {
    return dir
  }
  mkdirSync(dirname(dir), { recursive: true })
  const staging = mkdtempSync(`${dir}.partial-`)
  const excluded = excludes.map((pattern) => {
    return `--exclude=${pattern}`
  })
  try {
    run('tar', ['-xzf', archive, '-C', staging, '--strip-components=1', ...excluded])
  } catch (error) {
    rmSync(staging, { recursive: true, force: true })
    throw error
  }
  renameSync(staging, dir)
  return dir
}

const source = async ({ repo, commit }) => {
  const name = `${repo.replace('/', '-')}-${commit}`
  const archive = await download(
    `https://github.com/${repo}/archive/${commit}.tar.gz`,
    join(cacheDir, `${name}.tar.gz`),
  )
  return unpack(archive, join(cacheDir, 'src', name))
}

const toolchains = async () => {
  const [wasiAsset, wasiDigest] = toolchain.wasi
  const [binaryenAsset, binaryenDigest] = toolchain.binaryen
  const wasiArchive = await download(
    `https://github.com/WebAssembly/wasi-sdk/releases/download/wasi-sdk-${WASI_SDK_VERSION.split('.')[0]}/wasi-sdk-${WASI_SDK_VERSION}-${wasiAsset}.tar.gz`,
    join(cacheDir, `wasi-sdk-${WASI_SDK_VERSION}-${wasiAsset}.tar.gz`),
    wasiDigest,
  )
  const binaryenArchive = await download(
    `https://github.com/WebAssembly/binaryen/releases/download/version_${BINARYEN_VERSION}/binaryen-version_${BINARYEN_VERSION}-${binaryenAsset}.tar.gz`,
    join(cacheDir, `binaryen-version_${BINARYEN_VERSION}-${binaryenAsset}.tar.gz`),
    binaryenDigest,
  )
  return {
    wasi: unpack(wasiArchive, join(cacheDir, `wasi-sdk-${WASI_SDK_VERSION}-${wasiAsset}`), [
      '*/share/wasi-sysroot',
    ]),
    binaryen: unpack(
      binaryenArchive,
      join(cacheDir, `binaryen-${BINARYEN_VERSION}-${binaryenAsset}`),
    ),
  }
}

const goTools = () => {
  const bin = join(cacheDir, `wasm2go-${WASM2GO_VERSION}`)
  const env = { ...process.env, GOBIN: bin, CGO_ENABLED: '0' }
  for (const tool of ['github.com/ncruces/wasm2go', 'github.com/ncruces/wasm2go/libc-gen']) {
    run('go', ['install', '-trimpath', `${tool}@${WASM2GO_VERSION}`], { env, stdio: 'inherit' })
  }
  return { wasm2go: join(bin, 'wasm2go'), libcGen: join(bin, 'libc-gen') }
}

const exportsOf = (bonsai) => {
  const symbols = readFileSync(join(bonsai, 'build', 'exports.txt'), 'utf8')
    .split('\n')
    .map((line) => {
      return line.trim().split(' ')[0]
    })
    .filter((symbol) => {
      return symbol !== '' && !symbol.startsWith('#')
    })
  return [...symbols, LANGUAGE_SYMBOL].map((symbol) => {
    return `-Wl,--export=${symbol}`
  })
}

const identifier = (prefix, name) => {
  return (
    prefix +
    name
      .split(/_+/)
      .filter(Boolean)
      .map((part) => {
        return part[0].toUpperCase() + part.slice(1)
      })
      .join('')
  )
}

const constants = (prefix, names) => {
  const lines = [...names].sort().map((name) => {
    return `\t${identifier(prefix, name)} = ${JSON.stringify(name)}`
  })
  return `const (\n${lines.join('\n')}\n)\n`
}

const header = (provenance) => {
  return [
    `// Code generated by ${GENERATOR}. DO NOT EDIT.`,
    ...provenance.map((line) => {
      return `// ${line}`
    }),
    '',
    `package ${PACKAGE}`,
    '',
  ].join('\n')
}

const kindsFile = (grammar) => {
  const types = JSON.parse(readFileSync(join(grammar, 'src', 'node-types.json'), 'utf8'))
  const kinds = new Set()
  const fields = new Set()
  for (const type of types) {
    if (type.named && !type.subtypes && !type.type.startsWith('_')) {
      kinds.add(type.type)
    }
    for (const field of Object.keys(type.fields ?? {})) {
      fields.add(field)
    }
  }
  return `${header([])}\n${constants('Kind', kinds)}\n${constants('Field', fields)}`
}

const licensesFile = () => {
  return `${header([])}
import _ "embed"

//go:embed LICENSE.tree-sitter
var LicenseTreeSitter string

//go:embed LICENSE.grammar
var LicenseGrammar string

//go:embed LICENSE.bonsai
var LicenseBonsai string
`
}

const metaFile = (pages) => {
  return `${header([
    `tree-sitter ${TREE_SITTER.tag} (${TREE_SITTER.commit})`,
    `${GRAMMAR.repo} ${GRAMMAR.commit}`,
    `bonsai ${BONSAI.tag} (${BONSAI.commit}), wasm2go ${WASM2GO_VERSION}, wasi-sdk ${WASI_SDK_VERSION}, binaryen ${BINARYEN_VERSION}`,
  ])}
const InitialPages = ${pages}

const GrammarCommit = ${JSON.stringify(GRAMMAR.commit)}

const TreeSitterVersion = ${JSON.stringify(TREE_SITTER.tag)}

const BonsaiVersion = ${JSON.stringify(BONSAI.tag)}
`
}

const initialPages = (binaryen, wasm) => {
  const memory = run(join(binaryen, 'bin', 'wasm-dis'), [wasm])
    .split('\n')
    .find((line) => {
      return line.includes('"memory"')
    })
  const pages = memory?.match(/\(memory\s+(?:\$\S+\s+)?(\d+)/)?.[1]
  if (!pages) {
    throw new Error('could not read the initial memory pages from the wasm module')
  }
  return pages
}

const generate = async () => {
  mkdirSync(cacheDir, { recursive: true })
  const [grammar, treeSitter, bonsai] = await Promise.all([
    source(GRAMMAR),
    source(TREE_SITTER),
    source(BONSAI),
  ])
  const { wasi, binaryen } = await toolchains()
  const { wasm2go, libcGen } = goTools()
  const work = mkdtempSync(join(tmpdir(), 'oversee-gdscript-'))
  try {
    const libc = join(work, 'libc')
    run(libcGen, ['-c-out', libc])
    const linked = join(work, `${PACKAGE}.linked`)
    const wasm = join(work, `${PACKAGE}.wasm`)
    const inputs = join(bonsai, 'build')
    const toolPath = [join(wasi, 'bin'), join(binaryen, 'bin'), process.env.PATH].join(delimiter)
    run(
      join(wasi, 'bin', 'clang'),
      [
        ...CLANG_FLAGS,
        '-include',
        join(inputs, 'shim.h'),
        '-o',
        wasm,
        join(inputs, 'lib_min.c'),
        join(inputs, 'stubs.c'),
        join(libc, 'libc.c'),
        join(grammar, 'src', 'parser.c'),
        join(grammar, 'src', 'scanner.c'),
        `-I${join(treeSitter, 'lib', 'include')}`,
        `-I${join(treeSitter, 'lib', 'src')}`,
        `-I${join(grammar, 'src')}`,
        `-I${join(inputs, 'inc')}`,
        `-I${libc}`,
        ...exportsOf(bonsai),
      ],
      { env: { ...process.env, PATH: toolPath } },
    )
    renameSync(wasm, linked)
    run(join(binaryen, 'bin', 'wasm-opt'), ['-g', linked, '-o', wasm, ...WASM_OPT_FLAGS])

    mkdirSync(OUT_DIR, { recursive: true })
    const libcGo = join(OUT_DIR, 'libc_gen.go')
    run(libcGen, ['-wasm', wasm, '-o', libcGo])
    writeFileSync(
      libcGo,
      readFileSync(libcGo, 'utf8').replace(/^package .*$/m, `package ${PACKAGE}`),
    )
    run(wasm2go, [
      '-embed',
      '-unsafe',
      '-pkg',
      PACKAGE,
      '-provided',
      libcGo,
      '-o',
      join(OUT_DIR, 'module_gen.go'),
      wasm,
    ])

    writeFileSync(join(OUT_DIR, 'meta_gen.go'), metaFile(initialPages(binaryen, wasm)))
    writeFileSync(join(OUT_DIR, 'kinds_gen.go'), kindsFile(grammar))
    writeFileSync(join(OUT_DIR, 'licenses_gen.go'), licensesFile())
    copyFileSync(join(treeSitter, 'LICENSE'), join(OUT_DIR, 'LICENSE.tree-sitter'))
    copyFileSync(join(grammar, 'LICENSE'), join(OUT_DIR, 'LICENSE.grammar'))
    copyFileSync(join(bonsai, 'LICENSE'), join(OUT_DIR, 'LICENSE.bonsai'))
    run('gofmt', ['-w', OUT_DIR])
  } finally {
    rmSync(work, { recursive: true, force: true })
  }
  console.log(`generated ${OUT_DIR} from ${GRAMMAR.repo} ${GRAMMAR.commit}`)
}

const githubJson = async (endpoint) => {
  const headers = { Accept: 'application/vnd.github+json' }
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  }
  const response = await fetch(`https://api.github.com${endpoint}`, { headers })
  if (!response.ok) {
    throw new Error(`${endpoint}: ${response.status}`)
  }
  return response.json()
}

const shortCommit = (commit) => {
  return commit.slice(0, 7)
}

const semver = (tag) => {
  return tag.replace(/^v/, '').split('.').map(Number)
}

const newerTag = (candidate, pinned) => {
  const [left, right] = [semver(candidate), semver(pinned)]
  for (const index of [0, 1, 2]) {
    if (left[index] !== right[index]) {
      return left[index] > right[index]
    }
  }
  return false
}

const latestBonsaiTag = async (repo) => {
  const tags = await githubJson(`/repos/${repo}/tags?per_page=100`)
  return tags
    .map((tag) => {
      return tag.name
    })
    .filter((name) => {
      return /^v\d+\.\d+\.\d+$/.test(name)
    })
    .reduce((latest, name) => {
      return newerTag(name, latest) ? name : latest
    }, 'v0.0.0')
}

const update = async (pins) => {
  const { repo, branch, commit } = pins.grammar
  const latest = await githubJson(`/repos/${repo}/commits/${branch}`)
  const report = []
  if (latest.sha === commit) {
    report.push(`- ${repo}: no new commits on ${branch} since ${shortCommit(commit)}`)
  } else {
    const date = latest.commit.committer.date.slice(0, 10)
    report.push(
      `- ${repo}: ${shortCommit(commit)} to ${shortCommit(latest.sha)} (${date}), [compare](https://github.com/${repo}/compare/${commit}...${latest.sha})`,
    )
    writeFileSync(PINS_FILE, readFileSync(PINS_FILE, 'utf8').replace(commit, latest.sha))
    pins.grammar.commit = latest.sha
  }
  const release = await githubJson(`/repos/${pins.treeSitter.repo}/releases/latest`)
  if (newerTag(release.tag_name, pins.treeSitter.tag)) {
    report.push(
      `- ${pins.treeSitter.repo}: ${release.tag_name} is out, pinned ${pins.treeSitter.tag}. move it by hand together with bonsai's build inputs`,
    )
  }
  const bonsai = await latestBonsaiTag(pins.bonsai.repo)
  if (newerTag(bonsai, pins.bonsai.tag)) {
    report.push(
      `- ${pins.bonsai.repo}: ${bonsai} is out, pinned ${pins.bonsai.tag}. move it by hand with the go.mod version and its tree-sitter, wasm2go, wasi-sdk and binaryen pins`,
    )
  }
  return report
}

const summaryPath = (args) => {
  const index = args.indexOf('--summary')
  if (index < 0) {
    return null
  }
  return args[index + 1]
}

const args = process.argv.slice(2)
const pins = JSON.parse(readFileSync(PINS_FILE, 'utf8'))
const report = args.includes('--update') ? await update(pins) : []
const GRAMMAR = pins.grammar
const TREE_SITTER = pins.treeSitter
const BONSAI = pins.bonsai
const WASM2GO_VERSION = pins.wasm2go
const WASI_SDK_VERSION = pins.wasiSdk.version
const BINARYEN_VERSION = pins.binaryen.version
const platformKey = `${platform()}-${arch()}`
const toolchain = {
  wasi: pins.wasiSdk.assets[platformKey],
  binaryen: pins.binaryen.assets[platformKey],
}
if (!toolchain.wasi || !toolchain.binaryen) {
  console.error(`no pinned wasi-sdk and binaryen for ${platformKey}`)
  process.exit(1)
}

await generate()

const summary = summaryPath(args)
if (summary) {
  writeFileSync(
    summary,
    `## GDScript grammar\n\n${[...report, `- generated from ${GRAMMAR.repo} ${GRAMMAR.commit}`].join('\n')}\n`,
  )
}
