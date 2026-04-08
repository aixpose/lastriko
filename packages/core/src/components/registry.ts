import { atom, type WritableAtom } from 'nanostores';
import { randomUUID } from 'node:crypto';
import { existsSync, rmSync } from 'node:fs';
import type { AnyComponentHandle, ComponentType, ConnectionScope, ServerConnection } from './types';
import type { BatchedMessageEntry, FragmentMessage, ServerToClientMessage } from '../engine/messages';
import { renderComponent } from '../engine/renderer';

interface BatchBucket {
  timer: ReturnType<typeof setTimeout> | null;
  messages: BatchedMessageEntry[];
}

export function createConnectionScope(
  id?: string,
  transport: ServerConnection = { send: () => {} },
): ConnectionScope {
  const scopeId = id && id.trim() ? id : randomUUID();
  const atoms = new Map<string, WritableAtom<unknown>>();
  const handles = new Map<string, AnyComponentHandle>();
  const counters = new Map<ComponentType, number>();
  const roots: ConnectionScope['roots'] = [];
  const cleanupFns: Array<() => void> = [];
  const outbox: ConnectionScope['outbox'] = [];
  const batch: BatchBucket = { timer: null, messages: [] };

  const sendNow = (message: ServerToClientMessage) => {
    outbox.push(message);
    transport.send(message);
  };

  const flushBatch = () => {
    if (batch.messages.length === 0) {
      batch.timer = null;
      return;
    }
    const payload = { messages: batch.messages.splice(0) };
    batch.timer = null;
    sendNow({ type: 'BATCH', payload });
  };

  const scheduleBatchFlush = () => {
    if (batch.timer) {
      return;
    }
    batch.timer = setTimeout(() => {
      flushBatch();
    }, 16);
  };

  const enqueueBatchEntry = (entry: BatchedMessageEntry) => {
    const isFragment = entry.type === 'FRAGMENT';
    if (isFragment) {
      const fragmentId = entry.payload.id;
      const existing = batch.messages.findIndex((item) => item.type === 'FRAGMENT' && item.payload.id === fragmentId);
      if (existing >= 0) {
        batch.messages[existing] = entry;
      } else {
        batch.messages.push(entry);
      }
      scheduleBatchFlush();
      return;
    }

    batch.messages.push(entry);
    scheduleBatchFlush();
  };

  return {
    id: scopeId,
    connection: transport,
    atoms,
    handles,
    counters,
    roots,
    outbox,
    viewport: { width: 0, height: 0 },
    theme: 'light',
    uploadDir: null,
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
    pushNode(node) {
      roots.push(node);
    },
    listRoots() {
      return [...roots];
    },
    setValue(id: string, value: unknown): void {
      const valueAtom = this.getAtom<unknown>(`${id}/value`, value);
      valueAtom.set(value);
      const handle = handles.get(id);
      if (handle && 'props' in handle && typeof handle.props === 'object' && handle.props !== null) {
        (handle.props as Record<string, unknown>).value = value;
      }
    },
    send(message: ServerToClientMessage) {
      if (message.type === 'FRAGMENT' || message.type === 'STREAM_CHUNK') {
        enqueueBatchEntry(message);
        return;
      }
      sendNow(message);
    },
    pushFragment(handle: AnyComponentHandle): void {
      const fragment: FragmentMessage = {
        type: 'FRAGMENT',
        payload: { id: handle.id, html: renderComponent(handle) },
      };
      this.send(fragment);
    },
    onCleanup(fn: () => void): void {
      cleanupFns.push(fn);
    },
    clearTransientState(): void {
      if (batch.timer) {
        clearTimeout(batch.timer);
        batch.timer = null;
      }
      batch.messages.length = 0;
      atoms.clear();
      handles.clear();
      counters.clear();
      roots.length = 0;
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
      if (this.uploadDir && existsSync(this.uploadDir)) {
        try {
          rmSync(this.uploadDir, { recursive: true, force: true });
        } catch {
          // best effort
        }
      }
      cleanupFns.length = 0;
      this.clearTransientState();
    },
  };
}
