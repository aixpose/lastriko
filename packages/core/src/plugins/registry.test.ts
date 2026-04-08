import { describe, expect, test } from 'vitest';
import { createPluginRegistry } from './registry';
import type { LastrikoPlugin } from './types';

function createPlugin(name: string): LastrikoPlugin {
  return {
    name,
    version: '1.0.0',
    setup: async () => {},
    teardown: async () => {},
  };
}

describe('plugin registry', () => {
  test('setup and teardown execute in expected order', async () => {
    const order: string[] = [];
    const a: LastrikoPlugin = {
      name: 'a',
      version: '1.0.0',
      setup: async () => {
        order.push('setup-a');
      },
      teardown: async () => {
        order.push('teardown-a');
      },
    };
    const b: LastrikoPlugin = {
      name: 'b',
      version: '1.0.0',
      setup: async () => {
        order.push('setup-b');
      },
      teardown: async () => {
        order.push('teardown-b');
      },
    };

    const registry = createPluginRegistry([a, b]);
    await registry.setupAll();
    await registry.teardownAll();

    expect(order).toEqual(['setup-a', 'setup-b', 'teardown-b', 'teardown-a']);
    expect(registry.getPlugin('a')).toEqual({ name: 'a', version: '1.0.0' });
  });

  test('duplicate plugin names are rejected', () => {
    expect(() => createPluginRegistry([createPlugin('x'), createPlugin('x')])).toThrow(
      /Duplicate plugin name/,
    );
  });
});
