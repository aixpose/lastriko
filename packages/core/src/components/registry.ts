import { atom, type WritableAtom } from 'nanostores';
import { randomUUID } from 'node:crypto';
import type { AnyComponentHandle, ComponentType, ConnectionScope } from './types';
import { renderComponent } from '../engine/renderer';

export function createConnectionScope(
  id?: string,
  transport: ConnectionScope['connection'] = { send: () => {} },
): ConnectionScope {
  const scopeId = id && id.trim() ? id : randomUUID();
  const atoms = new Map<string, WritableAtom<unknown>>();
  const handles = new Map<string, AnyComponentHandle>();
  const counters = new Map<ComponentType, number>();
  const cleanupFns: Array<() => void> = [];
  const outbox: ConnectionScope['outbox'] = [];

  return {
    id: scopeId,
    connection: transport,
    atoms,
    handles,
    counters,
    outbox,
    lastRender: null,
    getAtom<T>(key: string, initialValue: T): WritableAtom<T> {
      if (!atoms.has(key)) {
        atoms.set(key, atom(initialValue));
      }
      return atoms.get(key) as WritableAtom<T>;
    },
    registerHandle(handle: AnyComponentHandle): void {
      handles.set(handle.id, handle);
    },
    getHandle(id: string): AnyComponentHandle | undefined {
      return handles.get(id);
    },
    listHandles(): AnyComponentHandle[] {
      return [...handles.values()];
    },
    setValue(id: string, value: unknown): void {
      const valueAtom = this.getAtom<unknown>(`${id}/value`, value);
      valueAtom.set(value);
    },
    send(message: ConnectionScope['outbox'][number]) {
      outbox.push(message);
      transport.send(message);
    },
    pushFragment(handle: AnyComponentHandle): void {
      this.send({
        type: 'FRAGMENT',
        payload: { id: handle.id, html: renderComponent(handle) },
      });
    },
    onCleanup(fn: () => void): void {
      cleanupFns.push(fn);
    },
    clearTransientState(): void {
      atoms.clear();
      handles.clear();
      counters.clear();
      outbox.length = 0;
      this.lastRender = null;
    },
    destroy(): void {
      for (const fn of cleanupFns) {
        try {
          fn();
        } catch {
          // best effort
        }
      }
      cleanupFns.length = 0;
      this.clearTransientState();
    },
  };
}
