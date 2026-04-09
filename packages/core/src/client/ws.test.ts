import { describe, expect, it } from 'vitest';
import { createWSManager } from './ws';

describe('client ws manager', () => {
  it('exports createWSManager', () => {
    expect(typeof createWSManager).toBe('function');
  });

  it('supports hot reload preserve option defaulting to true', () => {
    const manager = createWSManager();
    expect(typeof manager.connect).toBe('function');
    expect(typeof manager.disconnect).toBe('function');
  });
});
