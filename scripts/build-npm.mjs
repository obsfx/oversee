import { execFileSync } from 'node:child_process'
import { chmodSync, copyFileSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const OUT_DIR = join(ROOT, 'npm-dist')
const SCOPE = '@obsfx'
const MAIN_PACKAGE = `${SCOPE}/oversee`
const REPOSITORY = { type: 'git', url: 'git+https://github.com/obsfx/oversee.git' }
const LICENSE = 'MIT'
const KEYWORDS = [
  'agent-skills',
  'agentic-ai',
  'ai-agents',
  'ai-code-review',
  'annotation-tool',
  'call-graph',
  'claude-code',
  'cli',
  'code-review',
  'developer-tools',
  'diff-viewer',
  'git',
  'human-in-the-loop',
  'language-server-protocol',
]

const TARGETS = [
  { platform: 'darwin', arch: 'arm64', goos: 'darwin', goarch: 'arm64' },
  { platform: 'darwin', arch: 'x64', goos: 'darwin', goarch: 'amd64' },
  { platform: 'linux', arch: 'arm64', goos: 'linux', goarch: 'arm64' },
  { platform: 'linux', arch: 'x64', goos: 'linux', goarch: 'amd64' },
  { platform: 'win32', arch: 'arm64', goos: 'windows', goarch: 'arm64' },
  { platform: 'win32', arch: 'x64', goos: 'windows', goarch: 'amd64' },
]

const version = process.argv[2]?.replace(/^v/, '')
if (!version || !/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(version)) {
  console.error('usage: node scripts/build-npm.mjs <semver>')
  process.exit(1)
}

const writeJson = (path, value) => {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
}

const packageNameOf = ({ platform, arch }) => {
  return `${SCOPE}/oversee-${platform}-${arch}`
}

const copyRootFiles = (directory, names) => {
  for (const name of names) {
    copyFileSync(join(ROOT, name), join(directory, name))
  }
}

const generateWindowsResources = () => {
  const architectures = TARGETS.filter((target) => {
    return target.goos === 'windows'
  }).map((target) => {
    return target.goarch
  })
  console.log('generating windows resources')
  execFileSync(
    'go',
    [
      'tool',
      'go-winres',
      'make',
      '--arch',
      architectures.join(','),
      '--product-version',
      version,
      '--file-version',
      version,
    ],
    { cwd: join(ROOT, 'cmd', 'oversee'), stdio: 'inherit' },
  )
}

const buildTarget = (target) => {
  const name = packageNameOf(target)
  const directory = join(OUT_DIR, `oversee-${target.platform}-${target.arch}`)
  const executable = target.goos === 'windows' ? 'oversee.exe' : 'oversee'
  mkdirSync(join(directory, 'bin'), { recursive: true })
  console.log(`building ${name}`)
  execFileSync(
    'go',
    [
      'build',
      '-trimpath',
      '-ldflags',
      `-s -w -X main.version=${version}`,
      '-o',
      join(directory, 'bin', executable),
      './cmd/oversee',
    ],
    {
      cwd: ROOT,
      stdio: 'inherit',
      env: { ...process.env, CGO_ENABLED: '0', GOOS: target.goos, GOARCH: target.goarch },
    },
  )
  writeJson(join(directory, 'package.json'), {
    name,
    version,
    description: `The ${target.platform} ${target.arch} binary for ${MAIN_PACKAGE}.`,
    license: LICENSE,
    repository: REPOSITORY,
    os: [target.platform],
    cpu: [target.arch],
    files: ['bin'],
    preferUnplugged: true,
  })
  copyRootFiles(directory, ['LICENSE'])
}

const buildMainPackage = () => {
  const directory = join(OUT_DIR, 'oversee')
  const shim = join(directory, 'bin', 'oversee.js')
  mkdirSync(join(directory, 'bin'), { recursive: true })
  copyFileSync(join(ROOT, 'npm', 'oversee', 'bin', 'oversee.js'), shim)
  chmodSync(shim, 0o755)
  const optionalDependencies = {}
  for (const target of TARGETS) {
    optionalDependencies[packageNameOf(target)] = version
  }
  writeJson(join(directory, 'package.json'), {
    name: MAIN_PACKAGE,
    version,
    description: 'Diff review and line annotation for git repositories, with a CLI for AI agents.',
    keywords: KEYWORDS,
    license: LICENSE,
    repository: REPOSITORY,
    bin: { oversee: 'bin/oversee.js' },
    files: ['bin'],
    engines: { node: '>=18' },
    optionalDependencies,
  })
  copyRootFiles(directory, ['README.md', 'LICENSE'])
}

rmSync(OUT_DIR, { recursive: true, force: true })
generateWindowsResources()
for (const target of TARGETS) {
  buildTarget(target)
}
buildMainPackage()
console.log(`npm packages for ${version} are in ${OUT_DIR}`)
