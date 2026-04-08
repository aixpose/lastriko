import { UIContext } from '../components/context';
import type {
  AppCallback,
  ButtonHandle,
  FullscreenHandle,
  ConnectionScope,
  ParameterPanelHandle,
  TableHandle,
  TabsHandle,
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
  const handle = scope.getHandle(payload.id);
  if (!handle) {
    return;
  }

  if (payload.event === 'change') {
    scope.setValue(payload.id, payload.value);

    if (handle.type === 'table') {
      return;
    }

    if (handle.type === 'tabs') {
      const target = String(payload.value ?? '');
      (handle as TabsHandle).update({ value: target });
      return;
    }

    if (handle.type === 'parameterPanel') {
      const panel = handle as ParameterPanelHandle;
      panel.update({});
      return;
    }

    scope.pushFragment(handle);
    return;
  }

  if (payload.event !== 'click') {
    return;
  }

  if (handle.type === 'button') {
    const buttonHandle = handle as ButtonHandle;
    const callbackHandle = {
      setLoading(loading: boolean): void {
        buttonHandle.setLoading(loading);
      },
    };

    Promise.resolve(buttonHandle.props.onClick(callbackHandle)).catch((error) => {
      scope.send({
        type: 'TOAST',
        payload: {
          type: 'error',
          message: error instanceof Error ? error.message : String(error),
        },
      });
    });
    return;
  }

  if (handle.type === 'fullscreen') {
    const fullscreen = handle as FullscreenHandle;
    const current = fullscreen.value;
    fullscreen.update({ value: !current });
    return;
  }

  if (handle.type === 'table' && typeof payload.value === 'string') {
    const tableHandle = handle as TableHandle;
    const row = tableHandle.props.rows.find((entry) => entry.id === payload.value);
    if (!row) {
      return;
    }
    const clickHandler = tableHandle.props.getOnRowClick?.();
    if (!clickHandler) {
      return;
    }

    Promise.resolve(clickHandler(row.data)).catch((error) => {
      scope.send({
        type: 'TOAST',
        payload: {
          type: 'error',
          message: error instanceof Error ? error.message : String(error),
        },
      });
    });
  }
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
