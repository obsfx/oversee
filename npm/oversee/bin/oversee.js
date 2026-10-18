#!/usr/bin/env node
'use strict'

const { spawnSync } = require('node:child_process')

const platformPackage = `@obsfx/oversee-${process.platform}-${process.arch}`
const executable = process.platform === 'win32' ? 'oversee.exe' : 'oversee'

let binaryPath
try {
  binaryPath = require.resolve(`${platformPackage}/bin/${executable}`)
} catch {
  console.error(
    `oversee: no prebuilt binary for ${process.platform}-${process.arch}.\n` +
      `The optional dependency ${platformPackage} is missing. Reinstall without --no-optional, ` +
      'or check that your platform is supported.',
  )
  process.exit(1)
}

const result = spawnSync(binaryPath, process.argv.slice(2), { stdio: 'inherit' })

if (result.error) {
  console.error(`oversee: failed to start ${binaryPath}: ${result.error.message}`)
  process.exit(1)
}

if (result.signal) {
  process.kill(process.pid, result.signal)
} else {
  process.exit(result.status ?? 1)
}
