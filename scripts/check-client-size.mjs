import { readFileSync, statSync } from 'node:fs'
import { gzipSync } from 'node:zlib'

const CLIENT_LIMIT_BYTES = 15 * 1024
const CORE_LIMIT_BYTES = 50 * 1024

const defaultClientCandidates = [
  'packages/core/dist/client/index.js',
  'packages/core/dist/client.js',
]

const defaultCoreCandidates = [
  'packages/core/dist/index.js',
  'packages/core/dist/engine/server.js',
]

const cliClientPath = process.argv[2]
const cliCorePath = process.argv[3]

function exists(path) {
  try {
    statSync(path)
    return true
  } catch {
    return false
  }
}

function resolveTargetPath(cliPath, defaults) {
  const resolved = cliPath ?? defaults.find(exists)
  if (!resolved || !exists(resolved)) {
    console.error(
      `[bundle-check] Missing bundle. Tried: ${cliPath ? `"${cliPath}"` : defaults.join(', ')}. Run build first.`,
    )
    process.exit(1)
  }
  return resolved
}

function measureGzip(path) {
  const source = readFileSync(path)
  return gzipSync(source).byteLength
}

const clientPath = resolveTargetPath(cliClientPath, defaultClientCandidates)
const corePath = resolveTargetPath(cliCorePath, defaultCoreCandidates)

const clientSize = measureGzip(clientPath)
const coreSize = measureGzip(corePath)

if (clientSize > CLIENT_LIMIT_BYTES) {
  console.error(
    `[bundle-check] Client gzip size ${clientSize} bytes exceeds limit ${CLIENT_LIMIT_BYTES} bytes (${clientPath}).`,
  )
  process.exit(1)
}

if (coreSize > CORE_LIMIT_BYTES) {
  console.error(
    `[bundle-check] Core gzip size ${coreSize} bytes exceeds limit ${CORE_LIMIT_BYTES} bytes (${corePath}).`,
  )
  process.exit(1)
}

console.log(
  `[bundle-check] Client gzip size ${clientSize} bytes is within limit ${CLIENT_LIMIT_BYTES} bytes (${clientPath}).`,
)
console.log(
  `[bundle-check] Core gzip size ${coreSize} bytes is within limit ${CORE_LIMIT_BYTES} bytes (${corePath}).`,
)
