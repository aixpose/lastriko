import { readFileSync, statSync } from 'node:fs'
import { gzipSync } from 'node:zlib'

const defaultCandidates = [
  'packages/core/dist/client/index.js',
  'packages/core/dist/client.js',
]

const cliPath = process.argv[2]
const limitBytes = 15 * 1024

function exists(path) {
  try {
    statSync(path)
    return true
  } catch {
    return false
  }
}

const targetPath = cliPath ?? defaultCandidates.find(exists)

if (!targetPath || !exists(targetPath)) {
  console.error(
    `[bundle-check] Missing bundle. Tried: ${cliPath ? `"${cliPath}"` : defaultCandidates.join(', ')}. Run build first.`,
  )
  process.exit(1)
}

const source = readFileSync(targetPath)
const gzipped = gzipSync(source)
const size = gzipped.byteLength

if (size > limitBytes) {
  console.error(
    `[bundle-check] Client gzip size ${size} bytes exceeds limit ${limitBytes} bytes.`,
  )
  process.exit(1)
}

console.log(
  `[bundle-check] Client gzip size ${size} bytes is within limit ${limitBytes} bytes (${targetPath}).`,
)
