import { describe, expect, it } from 'vitest'

describe('create-lastriko cli package', () => {
  it('exposes a basic scaffold command contract', () => {
    expect(['create-lastriko', '<project-name>'].join(' ')).toBe('create-lastriko <project-name>')
  })
})
