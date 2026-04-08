export interface Watcher {
  stop: () => Promise<void> | void;
}

interface BunGlobal {
  watch?: (
    options: { paths: string[]; persistent?: boolean; recursive?: boolean },
    onEvent: () => void,
  ) => { close: () => void };
}

function getBunGlobal(): BunGlobal | null {
  const candidate = (globalThis as { Bun?: BunGlobal }).Bun;
  return candidate ?? null;
}

export async function createNodeWatcher(
  scriptPath: string,
  onReload: () => void,
  debounceMs: number,
): Promise<Watcher> {
  const { watch } = await import('chokidar');
  const debounced = createWatcher(onReload, debounceMs);
  const watcher = watch(scriptPath, { ignoreInitial: true });
  watcher.on('all', () => {
    debounced.scheduleReload();
  });
  return {
    stop: async () => {
      debounced.stop();
      await watcher.close();
    },
  };
}

export function createWatcher(onReload: () => void, debounceMs = 50): {
  scheduleReload: () => void;
  stop: () => void;
} {
  let timer: ReturnType<typeof setTimeout> | undefined;

  return {
    scheduleReload() {
      if (timer) {
        clearTimeout(timer);
      }
      timer = setTimeout(() => {
        timer = undefined;
        onReload();
      }, debounceMs);
    },
    stop() {
      if (timer) {
        clearTimeout(timer);
        timer = undefined;
      }
    },
  };
}

const runtimeDeps = {
  getBunGlobal,
  createNodeWatcher,
};

export const __internal = runtimeDeps;

export async function startWatcher(
  scriptPath: string,
  onReload: () => void,
  debounceMs = 50,
): Promise<Watcher> {
  const bun = runtimeDeps.getBunGlobal();
  if (bun?.watch) {
    const debounced = createWatcher(onReload, debounceMs);
    const bunWatcher = bun.watch(
      {
        paths: [scriptPath],
        persistent: true,
        recursive: false,
      },
      () => {
        debounced.scheduleReload();
      },
    );
    return {
      stop: () => {
        debounced.stop();
        bunWatcher.close();
      },
    };
  }

  return runtimeDeps.createNodeWatcher(scriptPath, onReload, debounceMs);
}
