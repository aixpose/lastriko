import type { ButtonCallbackHandle, ButtonHandle, TextHandle, UIContext as IUIContext, ConnectionScope } from './types';
import { createComponentId } from './id';

export class UIContext implements IUIContext {
  public constructor(public readonly scope: ConnectionScope) {}

  text(content: string): TextHandle {
    const id = createComponentId(this.scope, 'text');
    const valueAtom = this.scope.getAtom<string>(`${id}/value`, content);

    const handle: TextHandle = {
      id,
      type: 'text',
      props: { content },
      get value() {
        return valueAtom.get();
      },
      update: (next: string) => {
        valueAtom.set(next);
        handle.props.content = next;
        this.scope.pushFragment(handle);
      },
    };

    this.scope.registerHandle(handle);
    return handle;
  }

  button(label: string, onClick: (btn: ButtonCallbackHandle) => void | Promise<void>): ButtonHandle {
    const id = createComponentId(this.scope, 'button');
    const valueAtom = this.scope.getAtom<boolean>(`${id}/value`, false);

    const handle: ButtonHandle = {
      id,
      type: 'button',
      props: { label, loading: false, onClick },
      get value() {
        return valueAtom.get();
      },
      update: (patch) => {
        if (Object.prototype.hasOwnProperty.call(patch, 'label') && patch.label !== undefined) {
          handle.props.label = String(patch.label);
        }
        if (Object.prototype.hasOwnProperty.call(patch, 'loading') && patch.loading !== undefined) {
          const loading = Boolean(patch.loading);
          handle.props.loading = loading;
          valueAtom.set(loading);
        }
        this.scope.pushFragment(handle);
      },
      setLoading(loading: boolean) {
        handle.update({ loading });
      },
    };

    this.scope.registerHandle(handle);
    return handle;
  }

  onDisconnect(fn: () => void): void {
    this.scope.onCleanup(fn);
  }
}
