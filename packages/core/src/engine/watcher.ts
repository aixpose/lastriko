export interface Watcher {
  stop: () => Promise<void> | void;
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

export async function startWatcher(
  _scriptPath: string,
  onReload: () => void,
  debounceMs = 50,
): Promise<Watcher> {
  const watcher = createWatcher(onReload, debounceMs);
  return {
    stop: watcher.stop,
  };
}
