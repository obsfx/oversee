import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const NPM_DIST = join(ROOT, 'npm-dist')
const MAIN_PACKAGE_DIRECTORY = 'oversee'
const BUMPS = ['patch', 'minor', 'major']

const args = process.argv.slice(2)
const bump = args.find((arg) => {
  return !arg.startsWith('--')
})
const dryRun = args.includes('--dry-run')

const fail = (message) => {
  console.error(`release: ${message}`)
  process.exit(1)
}

const run = (command, commandArgs) => {
  console.log(`\n> ${command} ${commandArgs.join(' ')}`)
  execFileSync(command, commandArgs, { cwd: ROOT, stdio: 'inherit' })
}

const output = (command, commandArgs) => {
  return execFileSync(command, commandArgs, { cwd: ROOT, encoding: 'utf8' }).trim()
}

const succeeds = (command, commandArgs) => {
  try {
    execFileSync(command, commandArgs, { cwd: ROOT, stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

const nextVersion = (current) => {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(current)
  if (!match) {
    fail(`package.json version ${current} is not a plain major.minor.patch version`)
  }
  const [major, minor, patch] = match.slice(1).map(Number)
  if (bump === 'major') {
    return `${major + 1}.0.0`
  }
  if (bump === 'minor') {
    return `${major}.${minor + 1}.0`
  }
  return `${major}.${minor}.${patch + 1}`
}

const checkReady = (tag) => {
  if (!dryRun && output('git', ['status', '--porcelain']) !== '') {
    fail('the working tree has changes, commit or stash them first')
  }
  if (succeeds('git', ['rev-parse', '--quiet', '--verify', `refs/tags/${tag}`])) {
    fail(`tag ${tag} already exists`)
  }
  if (!dryRun && !succeeds('npm', ['whoami'])) {
    fail('npm is not logged in, run npm login first')
  }
}

const packageDirectories = () => {
  const platforms = readdirSync(NPM_DIST)
    .filter((name) => {
      return name.startsWith(`${MAIN_PACKAGE_DIRECTORY}-`)
    })
    .sort()
  return [...platforms, MAIN_PACKAGE_DIRECTORY].map((name) => {
    return join(NPM_DIST, name)
  })
}

const publish = (directory) => {
  const manifest = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8'))
  const spec = `${manifest.name}@${manifest.version}`
  if (succeeds('npm', ['view', spec, 'version'])) {
    console.log(`\n${spec} is already published`)
    return
  }
  const publishArgs = ['publish', directory, '--access', 'public']
  if (dryRun) {
    publishArgs.push('--dry-run')
  }
  run('npm', publishArgs)
}

if (!BUMPS.includes(bump)) {
  fail(`usage: pnpm release <${BUMPS.join('|')}> [--dry-run]`)
}

const current = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version
const version = nextVersion(current)
const tag = `v${version}`
checkReady(tag)
console.log(`releasing ${current} -> ${version}${dryRun ? ' (dry run)' : ''}`)

run('pnpm', ['ci'])
run('pnpm', ['build:cli'])
run('node', [join('scripts', 'build-npm.mjs'), version])
for (const directory of packageDirectories()) {
  publish(directory)
}

if (dryRun) {
  console.log(
    `\ndry run done: ${version} built and checked, nothing published, committed or tagged`,
  )
  process.exit(0)
}

run('pnpm', ['version', version, '--no-git-tag-version', '--no-git-checks'])
run('git', ['commit', '--message', tag, '--', 'package.json'])
run('git', ['tag', '--annotate', tag, '--message', tag])

console.log(`
${tag} is published on npm, committed and tagged locally. next:
  git push --atomic origin HEAD ${tag}
  gh workflow run executables.yml --field tag=${tag}`)
