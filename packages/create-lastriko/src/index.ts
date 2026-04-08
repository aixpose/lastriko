#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const projectName = process.argv[2]

if (!projectName) {
  console.error('Usage: create-lastriko <project-name>')
  process.exit(1)
}

const targetDir = path.resolve(process.cwd(), projectName)
const templateDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../templates/minimal',
)

const files = ['README.md', '.gitignore', 'demo.ts', 'package.json', 'tsconfig.json']

async function main() {
  await mkdir(targetDir, { recursive: false })

  for (const file of files) {
    const sourcePath = path.join(templateDir, file)
    const destinationPath = path.join(targetDir, file)
    let contents = await readFile(sourcePath, 'utf8')

    if (file === 'package.json') {
      contents = contents.replace(/__PROJECT_NAME__/g, projectName)
    }

    await writeFile(destinationPath, contents, 'utf8')
  }

  console.error(`Created ${projectName} at ${targetDir}`)
  console.error('Next steps:')
  console.error(`  cd ${projectName}`)
  console.error('  npm install')
  console.error('  npm run dev')
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown error'
  console.error(`Failed to create project: ${message}`)
  process.exit(1)
})
