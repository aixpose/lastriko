import { describe, expect, it } from 'vitest';
import { createLifecycleController } from './lifecycle';

describe('lifecycle state', () => {
  it('transitions to shutdown in order', () => {
    const lifecycle = createLifecycleController();
    lifecycle.toServerStart();
    lifecycle.toWaiting();
    lifecycle.toConnection();
    lifecycle.toRuntime();
    lifecycle.toStopping();
    lifecycle.toShutdown();
    expect(lifecycle.current()).toBe('SHUTDOWN');
  });
});
