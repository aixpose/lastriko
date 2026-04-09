import { describe, expect, it } from 'vitest';
import { applyBatch } from './swap';
import { createWSManager } from './ws';

describe('client ws manager', () => {
  it('exports createWSManager', () => {
    expect(typeof createWSManager).toBe('function');
  });

  it('exposes batch apply helper', () => {
    expect(typeof applyBatch).toBe('function');
  });
});
