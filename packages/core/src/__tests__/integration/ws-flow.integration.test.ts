import { describe, expect, it } from 'vitest';
import { createWebSocketHub } from '../../engine/websocket';

function createSocket() {
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

function byType<T = Record<string, unknown>>(sent: string[], type: string): T[] {
  return sent
    .map((item) => JSON.parse(item))
    .filter((msg) => msg.type === type) as T[];
}

describe('websocket integration flow', () => {
  it('ready emits RENDER and button click emits FRAGMENT', () => {
    const { socket, sent } = createSocket();
    const runtime = createWebSocketHub({
      title: 'Phase2',
      callback: (ui) => {
        const text = ui.text('before');
        ui.button('go', () => {
          text.update('after');
        });
      },
    });

    runtime.addConnection(socket);
    runtime.handleRawMessage(
      socket,
      JSON.stringify({
        type: 'READY',
        payload: { viewport: { width: 100, height: 100 }, theme: 'dark' },
      }),
    );

    const render = byType<{ type: 'RENDER'; payload: { html: string } }>(sent, 'RENDER')[0];
    expect(render).toBeDefined();
    expect(render?.payload.html).toContain('before');

    const buttonId = render?.payload.html.match(/data-lk-id="(button-[^"]+)"/)?.[1];
    expect(buttonId).toBeDefined();
    runtime.handleRawMessage(
      socket,
      JSON.stringify({
        type: 'EVENT',
        payload: { id: buttonId, event: 'click' },
      }),
    );

    const fragment = byType<{ type: 'FRAGMENT'; payload: { html: string } }>(sent, 'FRAGMENT').at(-1);
    expect(fragment?.payload.html).toContain('after');
  });

  it('change EVENT updates input value and pushes FRAGMENT', () => {
    const { socket, sent } = createSocket();
    const runtime = createWebSocketHub({
      title: 'Inputs',
      callback: (ui) => {
        ui.textInput('Prompt', { default: 'a' });
      },
    });

    runtime.addConnection(socket);
    runtime.handleRawMessage(
      socket,
      JSON.stringify({
        type: 'READY',
        payload: { viewport: { width: 100, height: 100 }, theme: null },
      }),
    );

    const render = byType<{ payload: { html: string } }>(sent, 'RENDER')[0];
    const inputId = render.payload.html.match(/data-lk-id="(textInput-[^"]+)"/)?.[1];
    expect(inputId).toBeDefined();

    runtime.handleRawMessage(
      socket,
      JSON.stringify({
        type: 'EVENT',
        payload: { id: inputId, event: 'change', value: 'updated' },
      }),
    );

    const fragment = byType<{ payload: { id: string; html: string } }>(sent, 'FRAGMENT').at(-1);
    expect(fragment?.payload.id).toBe(inputId);
    expect(fragment?.payload.html).toContain('updated');
  });

  it('streamText append emits STREAM_CHUNK messages in order', () => {
    const { socket, sent } = createSocket();
    const runtime = createWebSocketHub({
      title: 'Streaming',
      callback: (ui) => {
        const stream = ui.streamText({ format: 'plain' });
        ui.button('go', () => {
          stream.append('a');
          stream.append('b');
          stream.done();
        });
      },
    });

    runtime.addConnection(socket);
    runtime.handleRawMessage(
      socket,
      JSON.stringify({
        type: 'READY',
        payload: { viewport: { width: 100, height: 100 }, theme: null },
      }),
    );
    const render = byType<{ payload: { html: string } }>(sent, 'RENDER')[0];
    const buttonId = render.payload.html.match(/data-lk-id="(button-[^"]+)"/)?.[1];

    runtime.handleRawMessage(
      socket,
      JSON.stringify({
        type: 'EVENT',
        payload: { id: buttonId, event: 'click' },
      }),
    );

    const chunks = byType<{ payload: { chunk: string; done: boolean } }>(sent, 'STREAM_CHUNK');
    expect(chunks).toHaveLength(3);
    expect(chunks[0]?.payload.chunk).toBe('a');
    expect(chunks[1]?.payload.chunk).toBe('b');
    expect(chunks[2]?.payload.done).toBe(true);
  });

  it('table row click EVENT dispatches onRowClick handler', () => {
    const { socket, sent } = createSocket();
    const clicks: string[] = [];
    const runtime = createWebSocketHub({
      title: 'Table',
      callback: (ui) => {
        const table = ui.table([{ name: 'row-1' }], { columns: ['name'] });
        table.onRowClick((row) => {
          clicks.push(String(row.name));
        });
      },
    });

    runtime.addConnection(socket);
    runtime.handleRawMessage(
      socket,
      JSON.stringify({
        type: 'READY',
        payload: { viewport: { width: 120, height: 80 }, theme: null },
      }),
    );

    const render = byType<{ payload: { html: string } }>(sent, 'RENDER')[0];
    const tableId = render.payload.html.match(/data-lk-id="(table-[^"]+)"/)?.[1];
    const rowId = render.payload.html.match(/data-lk-table-row-id="([^"]+)"/)?.[1];
    expect(tableId).toBeDefined();
    expect(rowId).toBeDefined();

    runtime.handleRawMessage(
      socket,
      JSON.stringify({
        type: 'EVENT',
        payload: { id: tableId, event: 'click', value: rowId },
      }),
    );

    expect(clicks).toEqual(['row-1']);
  });

  it('tracks READY viewport/theme and handles THEME_CHANGE', () => {
    const { socket, sent } = createSocket();
    const runtime = createWebSocketHub({
      title: 'Scope',
      callback: (ui) => {
        ui.text(`viewport-${ui.viewport.width}x${ui.viewport.height}-${ui.theme}`);
      },
    });

    const scope = runtime.addConnection(socket);
    runtime.handleRawMessage(
      socket,
      JSON.stringify({
        type: 'READY',
        payload: { viewport: { width: 10, height: 20 }, theme: 'dark' },
      }),
    );
    expect(scope.viewport).toEqual({ width: 10, height: 20 });
    expect(scope.theme).toBe('dark');

    runtime.handleRawMessage(
      socket,
      JSON.stringify({
        type: 'THEME_CHANGE',
        payload: { mode: 'light' },
      }),
    );

    const themeMsg = byType<{ payload: { mode: string } }>(sent, 'THEME').at(-1);
    expect(themeMsg?.payload.mode).toBe('light');
  });

  it('numberInput and toggle change EVENT update values and emit FRAGMENT', () => {
    const { socket, sent } = createSocket();
    const runtime = createWebSocketHub({
      title: 'More inputs',
      callback: (ui) => {
        ui.numberInput('N', { default: 1 });
        ui.toggle('T', { default: false });
      },
    });

    runtime.addConnection(socket);
    runtime.handleRawMessage(
      socket,
      JSON.stringify({
        type: 'READY',
        payload: { viewport: { width: 100, height: 100 }, theme: null },
      }),
    );

    const render = byType<{ payload: { html: string } }>(sent, 'RENDER')[0];
    const numId = render.payload.html.match(/data-lk-id="(numberInput-[^"]+)"/)?.[1];
    const toggleId = render.payload.html.match(/data-lk-id="(toggle-[^"]+)"/)?.[1];
    expect(numId).toBeDefined();
    expect(toggleId).toBeDefined();

    runtime.handleRawMessage(
      socket,
      JSON.stringify({
        type: 'EVENT',
        payload: { id: numId, event: 'change', value: 42 },
      }),
    );
    const fragNum = byType<{ payload: { id: string; html: string } }>(sent, 'FRAGMENT').at(-1);
    expect(fragNum?.payload.id).toBe(numId);
    expect(fragNum?.payload.html).toContain('value="42"');

    runtime.handleRawMessage(
      socket,
      JSON.stringify({
        type: 'EVENT',
        payload: { id: toggleId, event: 'change', value: true },
      }),
    );
    const fragToggle = byType<{ payload: { id: string; html: string } }>(sent, 'FRAGMENT').at(-1);
    expect(fragToggle?.payload.id).toBe(toggleId);
    expect(fragToggle?.payload.html).toContain('checked');
  });

  it('cross-region: sidebar button updates header metric via shared scope', () => {
    const { socket, sent } = createSocket();
    const runtime = createWebSocketHub({
      title: 'Shell',
      callback: (ui) => {
        let metric: ReturnType<typeof ui.metric> | undefined;
        ui.shell({
          header: (h) => {
            metric = h.metric('Count', '0');
          },
          main: () => {},
          sidebar: (s) => {
            s.button('inc', () => {
              metric?.update('1');
            });
          },
        });
      },
    });

    runtime.addConnection(socket);
    runtime.handleRawMessage(
      socket,
      JSON.stringify({
        type: 'READY',
        payload: { viewport: { width: 200, height: 200 }, theme: null },
      }),
    );

    const render = byType<{ payload: { html: string } }>(sent, 'RENDER')[0];
    const buttonId = render.payload.html.match(/data-lk-id="(button-[^"]+)"/)?.[1];
    expect(buttonId).toBeDefined();
    expect(render.payload.html).toContain('lk-metric-value');

    runtime.handleRawMessage(
      socket,
      JSON.stringify({
        type: 'EVENT',
        payload: { id: buttonId, event: 'click' },
      }),
    );

    const lastMetricFrag = [...byType<{ payload: { html: string } }>(sent, 'FRAGMENT')]
      .filter((f) => f.payload.html.includes('lk-metric'))
      .at(-1);
    expect(lastMetricFrag?.payload.html).toContain('1');
  });

  it('keeps scopes isolated across connections', () => {
    const a = createSocket();
    const b = createSocket();
    const runtime = createWebSocketHub({
      title: 'Isolation',
      callback: (ui) => {
        ui.text(`scope-${ui.scope.id}`);
      },
    });

    const scopeA = runtime.addConnection(a.socket);
    const scopeB = runtime.addConnection(b.socket);
    runtime.handleRawMessage(
      a.socket,
      JSON.stringify({
        type: 'READY',
        payload: { viewport: { width: 10, height: 10 }, theme: null },
      }),
    );
    runtime.handleRawMessage(
      b.socket,
      JSON.stringify({
        type: 'READY',
        payload: { viewport: { width: 20, height: 20 }, theme: null },
      }),
    );

    const aRender = byType<{ payload: { html: string } }>(a.sent, 'RENDER')[0];
    const bRender = byType<{ payload: { html: string } }>(b.sent, 'RENDER')[0];
    expect(aRender.payload.html).toContain(`scope-${scopeA.id}`);
    expect(bRender.payload.html).toContain(`scope-${scopeB.id}`);
    expect(scopeA.id).not.toBe(scopeB.id);
  });
});
