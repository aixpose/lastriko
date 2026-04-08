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

describe('websocket integration flow', () => {
  it('rEADY emits RENDER and click EVENT emits FRAGMENT', async () => {
    const { socket, sent } = createSocket();
    const runtime = createWebSocketHub({
      title: 'Phase1',
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
        payload: { viewport: { width: 100, height: 100 }, theme: null },
      }),
    );

    const renderRaw = sent.find((item) => JSON.parse(item).type === 'RENDER');
    expect(renderRaw).toBeDefined();
    const render = JSON.parse(renderRaw ?? '{}');
    expect(render.payload.html).toContain('before');

    const buttonId = render.payload.html.match(/data-lk-id="(button-[^"]+)"/)?.[1] as string;
    runtime.handleRawMessage(
      socket,
      JSON.stringify({
        type: 'EVENT',
        payload: { id: buttonId, event: 'click' },
      }),
    );

    const fragmentRaw = sent.find((item) => JSON.parse(item).type === 'FRAGMENT');
    expect(fragmentRaw).toBeDefined();
    const fragment = JSON.parse(fragmentRaw ?? '{}');
    expect(fragment.payload.html).toContain('after');
  });

  it('two connections render independently', () => {
    const a = createSocket();
    const b = createSocket();
    const runtime = createWebSocketHub({
      title: 'Scope',
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
        payload: { viewport: { width: 10, height: 10 }, theme: null },
      }),
    );

    const aRender = JSON.parse(a.sent.find((item) => JSON.parse(item).type === 'RENDER') ?? '{}');
    const bRender = JSON.parse(b.sent.find((item) => JSON.parse(item).type === 'RENDER') ?? '{}');
    expect(aRender.payload.html).toContain(`scope-${scopeA.id}`);
    expect(bRender.payload.html).toContain(`scope-${scopeB.id}`);
  });
});
