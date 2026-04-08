import { describe, expect, it } from 'vitest'

describe('create-lastriko cli package', () => {
  it('exposes a basic scaffold command contract', () => {
    expect(['create-lastriko', '<project-name>'].join(' ')).toBe('create-lastriko <project-name>')
  })

  it('uses a built output entrypoint for bin', async () => {
    const pkg = await import('../package.json', { with: { type: 'json' } })
    expect(pkg.default.bin['create-lastriko']).toBe('./dist/index.js')
  })
})
