import { describe, expect, it, vi } from 'vitest';
import { __internal, createWatcher, startWatcher } from './watcher';

describe('watcher', () => {
  it('debounces reload calls', async () => {
    vi.useFakeTimers();
    const onReload = vi.fn();
    const watcher = createWatcher(onReload, 50);

    watcher.scheduleReload();
    watcher.scheduleReload();
    watcher.scheduleReload();
    expect(onReload).not.toHaveBeenCalled();

    vi.advanceTimersByTime(49);
    expect(onReload).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onReload).toHaveBeenCalledTimes(1);
    watcher.stop();
    vi.useRealTimers();
  });

  it('uses Bun watcher when available', async () => {
    const originalBun = (globalThis as { Bun?: unknown }).Bun;
    const close = vi.fn();
    const bunWatch = vi.fn(() => ({ close }));
    (globalThis as { Bun?: unknown }).Bun = { watch: bunWatch };

    try {
      const watcher = await startWatcher('/tmp/demo.ts', () => {}, 10);
      expect(bunWatch).toHaveBeenCalledTimes(1);
      expect(bunWatch).toHaveBeenCalledWith(
        expect.objectContaining({ paths: ['/tmp/demo.ts'] }),
        expect.any(Function),
      );
      watcher.stop();
      expect(close).toHaveBeenCalledTimes(1);
    } finally {
      if (originalBun === undefined) {
        delete (globalThis as { Bun?: unknown }).Bun;
      } else {
        (globalThis as { Bun?: unknown }).Bun = originalBun;
      }
    }
  });

  it('selects Node fallback when Bun is unavailable', async () => {
    const originalBun = (globalThis as { Bun?: unknown }).Bun;
    delete (globalThis as { Bun?: unknown }).Bun;
    const nodeStop = vi.fn();
    const createNodeWatcherSpy = vi
      .spyOn(__internal, 'createNodeWatcher')
      .mockResolvedValue({ stop: nodeStop });

    try {
      const watcher = await startWatcher('/tmp/demo.ts', () => {}, 25);
      await watcher.stop();
      expect(createNodeWatcherSpy).toHaveBeenCalledTimes(1);
      expect(createNodeWatcherSpy).toHaveBeenCalledWith('/tmp/demo.ts', expect.any(Function), 25);
      expect(nodeStop).toHaveBeenCalledTimes(1);
    } finally {
      createNodeWatcherSpy.mockRestore();
      if (originalBun !== undefined) {
        (globalThis as { Bun?: unknown }).Bun = originalBun;
      }
    }
  });
});
