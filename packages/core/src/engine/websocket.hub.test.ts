import { describe, expect, it } from 'vitest';
import { createWebSocketHub } from './websocket';

function captureSocket() {
  const sent: string[] = [];
  return {
    socket: {
      send(data: string) {
        sent.push(data);
      },
    },
    sent,
  };
}

function parseSent(sent: string[]) {
  return sent.map((s) => JSON.parse(s) as { type: string; payload?: unknown });
}

describe('webSocketHub', () => {
  it('applies RESIZE to connection viewport', () => {
    const { socket, sent } = captureSocket();
    const hub = createWebSocketHub({
      title: 't',
      callback: () => {},
    });
    const scope = hub.addConnection(socket);
    hub.handleRawMessage(
      socket,
      JSON.stringify({ type: 'RESIZE', payload: { width: 400, height: 300 } }),
    );
    expect(scope.viewport).toEqual({ width: 400, height: 300 });
    expect(sent.length).toBeGreaterThan(0);
  });

  it('broadcasts hot reload and re-runs app', () => {
    let runs = 0;
    const { socket, sent } = captureSocket();
    const hub = createWebSocketHub({
      title: 'hot',
      callback: () => {
        runs++;
      },
    });
    hub.addConnection(socket);
    hub.handleRawMessage(
      socket,
      JSON.stringify({
        type: 'READY',
        payload: { viewport: { width: 1, height: 1 }, theme: 'light' },
      }),
    );
    expect(runs).toBe(1);
    const before = sent.length;
    hub.handleHotReload();
    expect(runs).toBe(2);
    expect(sent.length).toBeGreaterThan(before);
  });

  it('sends ERROR when app callback throws on READY', () => {
    const { socket, sent } = captureSocket();
    const hub = createWebSocketHub({
      title: 'bad',
      callback: () => {
        throw new Error('boom');
      },
    });
    hub.addConnection(socket);
    hub.handleRawMessage(
      socket,
      JSON.stringify({
        type: 'READY',
        payload: { viewport: { width: 1, height: 1 }, theme: null },
      }),
    );
    const msgs = parseSent(sent);
    expect(msgs.some((m) => m.type === 'ERROR')).toBe(true);
  });

  it('ignores messages from unknown sockets', () => {
    const { socket, sent } = captureSocket();
    const hub = createWebSocketHub({ title: 'x', callback: () => {} });
    hub.handleRawMessage(
      socket,
      JSON.stringify({
        type: 'READY',
        payload: { viewport: { width: 1, height: 1 }, theme: null },
      }),
    );
    expect(sent).toHaveLength(0);
  });

  it('emits BATCH when component changes rapidly', async () => {
    const { socket, sent } = captureSocket();
    const hub = createWebSocketHub({
      title: 'batch',
      callback: (ui) => {
        const input = ui.textInput('Prompt', { default: '' });
        ui.text(`v:${input.value}`);
      },
    });
    const scope = hub.addConnection(socket);
    hub.handleRawMessage(
      socket,
      JSON.stringify({
        type: 'READY',
        payload: { viewport: { width: 10, height: 10 }, theme: null },
      }),
    );
    const input = scope.getHandle('textInput-1');
    expect(input).toBeDefined();
    hub.handleRawMessage(
      socket,
      JSON.stringify({
        type: 'EVENT',
        payload: { id: input?.id, event: 'change', value: 'abc' },
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 30));
    const msgs = parseSent(sent);
    expect(msgs.some((m) => m.type === 'BATCH')).toBe(true);
  });
});
