export type ThemeMode = 'light' | 'dark';

export interface RenderPayload {
  html: string;
  title: string;
  theme: ThemeMode;
}

export interface RenderMessage {
  type: 'RENDER';
  payload: RenderPayload;
}

export interface FragmentMessage {
  type: 'FRAGMENT';
  payload: {
    id: string;
    html: string;
  };
}

export interface ToastMessage {
  type: 'TOAST';
  payload: {
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    duration?: number;
  };
}

export interface ThemeMessage {
  type: 'THEME';
  payload: {
    mode: ThemeMode;
  };
}

export interface StreamChunkMessage {
  type: 'STREAM_CHUNK';
  payload: {
    id: string;
    chunk: string;
    done: boolean;
    format: 'plain' | 'markdown';
  };
}

export interface StreamErrorMessage {
  type: 'STREAM_ERROR';
  payload: {
    id: string;
    error: string;
  };
}

export interface ErrorMessage {
  type: 'ERROR';
  payload: {
    message: string;
    stack?: string;
  };
}

export type BatchedInnerMessage = FragmentMessage | StreamChunkMessage;
export type BatchedMessageEntry = BatchedInnerMessage;

export interface BatchMessage {
  type: 'BATCH';
  payload: {
    messages: BatchedInnerMessage[];
  };
}

export type ServerMessage
  = | RenderMessage
    | FragmentMessage
    | ToastMessage
    | ThemeMessage
    | StreamChunkMessage
    | StreamErrorMessage
    | ErrorMessage
    | BatchMessage;
export type ServerToClientMessage = ServerMessage;

export interface ReadyMessage {
  type: 'READY';
  payload: {
    viewport: {
      width: number;
      height: number;
    };
    theme: ThemeMode | null;
  };
}

export interface ClientEventPayload {
  id: string;
  event: 'click' | 'change' | 'blur' | 'focus';
  value?: unknown;
}

export interface EventMessage {
  type: 'EVENT';
  payload: ClientEventPayload;
}

export interface ThemeChangeMessage {
  type: 'THEME_CHANGE';
  payload: {
    mode: ThemeMode;
  };
}

export interface ResizeMessage {
  type: 'RESIZE';
  payload: {
    width: number;
    height: number;
  };
}

export type ClientMessage = ReadyMessage | EventMessage | ThemeChangeMessage | ResizeMessage;
export type ClientToServerMessage = ClientMessage;

export interface Transport {
  send: (message: ServerMessage) => void;
}

export function parseClientMessage(raw: unknown): ClientMessage | null {
  if (typeof raw !== 'string')
    return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== 'object')
    return null;

  const type = (parsed as { type?: unknown }).type;
  if (type !== 'READY' && type !== 'EVENT' && type !== 'THEME_CHANGE' && type !== 'RESIZE')
    return null;

  return parsed as ClientMessage;
}

export function serializeServerMessage(message: ServerMessage): string {
  return JSON.stringify(message);
}
