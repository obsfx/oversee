#!/usr/bin/env node
'use strict'

const { spawn } = require('node:child_process')

const platformPackage = `@obsfx/oversee-${process.platform}-${process.arch}`
const executable = process.platform === 'win32' ? 'oversee.exe' : 'oversee'
const forwardedSignals = ['SIGINT', 'SIGTERM', 'SIGHUP']
const consoleSignalsReachChild = process.platform === 'win32'

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

const child = spawn(binaryPath, process.argv.slice(2), { stdio: 'inherit' })

const relaySignal = (signal) => {
  if (!consoleSignalsReachChild) {
    child.kill(signal)
  }
}

for (const signal of forwardedSignals) {
  process.on(signal, relaySignal)
}

child.on('error', (error) => {
  console.error(`oversee: failed to start ${binaryPath}: ${error.message}`)
  process.exit(1)
})

child.on('exit', (code, signal) => {
  for (const forwarded of forwardedSignals) {
    process.off(forwarded, relaySignal)
  }
  if (signal) {
    process.kill(process.pid, signal)
  } else {
    process.exit(code ?? 1)
  }
})
