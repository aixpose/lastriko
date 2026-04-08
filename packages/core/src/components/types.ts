import type { WritableAtom } from 'nanostores';
import type { ServerToClientMessage, ThemeMode } from '../engine/messages';

export type ComponentType = 'text' | 'button';

export interface ComponentHandle<TProps, TValue = void> {
  readonly id: string;
  readonly type: ComponentType;
  props: TProps;
  readonly value: TValue;
  update(data: Partial<TProps & { value: TValue }>): void;
}

export interface InputHandle<TValue> extends ComponentHandle<Record<string, unknown>, TValue> {
  readonly value: TValue;
}

export interface ButtonCallbackHandle {
  setLoading(loading: boolean): void;
}

export interface TextProps {
  content: string;
}

export interface ButtonProps {
  label: string;
  loading: boolean;
  onClick: (btn: ButtonCallbackHandle) => void | Promise<void>;
}

export interface TextHandle extends Omit<ComponentHandle<TextProps, string>, 'update'> {
  readonly type: 'text';
  update(content: string): void;
}

export interface ButtonHandle extends ComponentHandle<ButtonProps, boolean> {
  readonly type: 'button';
  setLoading(loading: boolean): void;
}

export type AnyComponentHandle = TextHandle | ButtonHandle;

export interface ServerConnection {
  send: (message: ServerToClientMessage) => void;
  close?: () => void;
  isOpen?: () => boolean;
}

export interface LastRenderState {
  html: string;
  title: string;
  theme: ThemeMode;
}

export interface ConnectionScope {
  readonly id: string;
  readonly connection: ServerConnection;
  readonly atoms: Map<string, WritableAtom<unknown>>;
  readonly handles: Map<string, AnyComponentHandle>;
  readonly counters: Map<ComponentType, number>;
  readonly outbox: ServerToClientMessage[];
  lastRender: LastRenderState | null;
  getAtom<T>(key: string, initialValue: T): WritableAtom<T>;
  registerHandle(handle: AnyComponentHandle): void;
  getHandle(id: string): AnyComponentHandle | undefined;
  listHandles(): AnyComponentHandle[];
  setValue(id: string, value: unknown): void;
  send(message: ServerToClientMessage): void;
  pushFragment(handle: AnyComponentHandle): void;
  onCleanup(fn: () => void): void;
  clearTransientState(): void;
  destroy(): void;
}

export interface UIContext {
  readonly scope: ConnectionScope;
  text(content: string): TextHandle;
  button(label: string, onClick: (btn: ButtonCallbackHandle) => void | Promise<void>): ButtonHandle;
  onDisconnect(fn: () => void): void;
}

export type AppCallback = (ui: UIContext) => void | Promise<void>;
export type Connection = ServerConnection;
