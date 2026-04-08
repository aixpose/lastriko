import { gzipSync } from 'node:zlib';
import { readFileSync, statSync } from 'node:fs';

const defaultPath = 'packages/core/dist/client.js';
const targetPath = process.argv[2] ?? defaultPath;
const limitBytes = 15 * 1024;

try {
  statSync(targetPath);
} catch {
  console.error(`[bundle-check] Missing bundle at "${targetPath}". Run build first.`);
  process.exit(1);
}

const source = readFileSync(targetPath);
const gzipped = gzipSync(source);
const size = gzipped.byteLength;

if (size > limitBytes) {
  console.error(
    `[bundle-check] Client gzip size ${size} bytes exceeds limit ${limitBytes} bytes.`,
  );
  process.exit(1);
}

console.log(
  `[bundle-check] Client gzip size ${size} bytes is within limit ${limitBytes} bytes.`,
);
