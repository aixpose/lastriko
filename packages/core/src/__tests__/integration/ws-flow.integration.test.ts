import { describe, expect, it } from 'vitest';
import type { BatchMessage } from '../../engine/messages';
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

function parseAll(sent: string[]) {
  return sent.map((item) => JSON.parse(item) as { type: string; payload?: unknown });
}

function ofType<T = Record<string, unknown>>(sent: string[], type: string): T[] {
  return parseAll(sent).filter((msg) => msg.type === type) as T[];
}

function batchedEntries(sent: string[]) {
  const batches = ofType<BatchMessage>(sent, 'BATCH');
  return batches.flatMap((batch) => batch.payload.messages);
}

describe('websocket integration flow', () => {
  it('ready emits RENDER and button click emits FRAGMENT via BATCH', async () => {
    const { socket, sent } = createSocket();
    const runtime = createWebSocketHub({
      title: 'Phase3',
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

    const render = ofType<{ payload: { html: string } }>(sent, 'RENDER')[0];
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

    await new Promise((resolve) => setTimeout(resolve, 25));
    const fragment = batchedEntries(sent)
      .find((entry) => entry.type === 'FRAGMENT' && entry.payload.id === 'text-1');
    expect(fragment).toBeDefined();
    if (fragment?.type !== 'FRAGMENT')
      throw new Error('Expected FRAGMENT entry');
    expect(fragment.payload.html).toContain('after');
  });

  it('change EVENT updates input value and emits batched FRAGMENT', async () => {
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

    const render = ofType<{ payload: { html: string } }>(sent, 'RENDER')[0];
    const inputId = render.payload.html.match(/data-lk-id="(textInput-[^"]+)"/)?.[1];
    expect(inputId).toBeDefined();

    runtime.handleRawMessage(
      socket,
      JSON.stringify({
        type: 'EVENT',
        payload: { id: inputId, event: 'change', value: 'updated' },
      }),
    );

    await new Promise((resolve) => setTimeout(resolve, 25));
    const fragment = batchedEntries(sent)
      .find((entry) => entry.type === 'FRAGMENT' && entry.payload.id === inputId);
    expect(fragment).toBeDefined();
    if (fragment?.type !== 'FRAGMENT')
      throw new Error('Expected FRAGMENT entry');
    expect(fragment.payload.html).toContain('updated');
  });

  it('streamText append emits batched STREAM_CHUNK entries in order', async () => {
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
    const render = ofType<{ payload: { html: string } }>(sent, 'RENDER')[0];
    const buttonId = render.payload.html.match(/data-lk-id="(button-[^"]+)"/)?.[1];

    runtime.handleRawMessage(
      socket,
      JSON.stringify({
        type: 'EVENT',
        payload: { id: buttonId, event: 'click' },
      }),
    );

    await new Promise((resolve) => setTimeout(resolve, 25));
    const chunks = batchedEntries(sent).filter((entry) => entry.type === 'STREAM_CHUNK');
    expect(chunks).toHaveLength(3);
    expect(chunks[0]?.type === 'STREAM_CHUNK' ? chunks[0].payload.chunk : '').toBe('a');
    expect(chunks[1]?.type === 'STREAM_CHUNK' ? chunks[1].payload.chunk : '').toBe('b');
    expect(chunks[2]?.type === 'STREAM_CHUNK' ? chunks[2].payload.done : false).toBe(true);
  });

  it('table row click EVENT dispatches onRowClick handler', async () => {
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

    const render = ofType<{ payload: { html: string } }>(sent, 'RENDER')[0];
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

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(clicks).toEqual(['row-1']);
  });
});
