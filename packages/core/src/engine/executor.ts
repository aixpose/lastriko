import { UIContext } from '../components/context';
import type {
  AppCallback,
  ConnectionScope,
} from '../components/types';
import type { ClientEventPayload, ThemeMode } from './messages';
import { renderPage } from './renderer';

export interface AppDefinition {
  title: string;
  callback: AppCallback;
}

export function runAppForScope(
  scope: ConnectionScope,
  title: string,
  callback: AppCallback,
  theme: ThemeMode,
): { html: string; title: string; theme: ThemeMode } {
  scope.counters.clear();
  scope.handles.clear();
  const ui = new UIContext(scope);
  callback(ui);
  const html = renderPage(scope.listHandles());
  const render = { html, title, theme };
  scope.send({ type: 'RENDER', payload: render });
  return render;
}

export function handleClientEvent(scope: ConnectionScope, payload: ClientEventPayload): void {
  if (payload.event === 'change') {
    scope.setValue(payload.id, payload.value);
    return;
  }

  if (payload.event !== 'click') {
    return;
  }

  const handle = scope.getHandle(payload.id);
  if (!handle || handle.type !== 'button') {
    return;
  }

  const callbackHandle = {
    setLoading(loading: boolean): void {
      handle.setLoading(loading);
    },
  };

  Promise.resolve(handle.props.onClick(callbackHandle)).catch((error) => {
    scope.send({
      type: 'TOAST',
      payload: {
        type: 'error',
        message: error instanceof Error ? error.message : String(error),
      },
    });
  });
}

export function executeApp(
  appDef: AppDefinition,
  scope: ConnectionScope,
  theme: ThemeMode,
): { ok: true; html: string } | { ok: false; error: Error } {
  try {
    const render = runAppForScope(scope, appDef.title, appDef.callback, theme);
    return { ok: true, html: render.html };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

export function resetScopeForRerender(scope: ConnectionScope): void {
  scope.handles.clear();
  scope.counters.clear();
}
