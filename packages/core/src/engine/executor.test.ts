import { describe, expect, it, vi } from 'vitest';
import { UIContext } from '../components/context';
import { createConnectionScope } from '../components/registry';
import { executeApp, handleClientEvent } from './executor';

describe('executeApp', () => {
  it('returns ok with html when callback succeeds', () => {
    const scope = createConnectionScope('exec-ok');
    const result = executeApp(
      { title: 't', callback: (ui) => {
        ui.text('hi');
      } },
      scope,
      'light',
    );
    expect(result.ok).toBe(true);
    if (result.ok)
      expect(result.html).toContain('hi');
  });

  it('returns ok: false when callback throws', () => {
    const scope = createConnectionScope('exec-err');
    const result = executeApp(
      { title: 't', callback: () => { throw new Error('fail'); } },
      scope,
      'light',
    );
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.error.message).toBe('fail');
  });
});

describe('handleClientEvent', () => {
  it('does not push FRAGMENT for table change events (row selection)', () => {
    const scope = createConnectionScope('exec-table');
    const ui = new UIContext(scope);
    ui.table([{ name: 'a' }], { columns: ['name'] });
    const table = scope.getHandle('table-1');
    expect(table).toBeDefined();
    scope.outbox.length = 0;

    handleClientEvent(scope, {
      id: table!.id,
      event: 'change',
      value: 'some-row-id',
    });

    expect(scope.outbox.filter((m) => m.type === 'FRAGMENT')).toHaveLength(0);
  });

  it('invokes button onClick and reflects setLoading in FRAGMENT payloads', async () => {
    const scope = createConnectionScope('exec-btn');
    const ui = new UIContext(scope);
    ui.button('Run', async (btn) => {
      btn.setLoading(true);
      await Promise.resolve();
      btn.setLoading(false);
    });
    const button = scope.getHandle('button-1');
    expect(button).toBeDefined();
    scope.outbox.length = 0;

    handleClientEvent(scope, {
      id: button!.id,
      event: 'click',
    });

    await vi.waitFor(() => {
      const batched = scope.outbox.filter((m) => m.type === 'BATCH') as Array<{
        payload: { messages: Array<{ type: 'FRAGMENT'; payload: { id: string; html: string } }> };
      }>;
      const fragments = batched
        .flatMap((entry) => entry.payload.messages)
        .filter((entry) => entry.type === 'FRAGMENT' && entry.payload.id === button!.id);
      expect(fragments.length).toBeGreaterThanOrEqual(1);
    });

    const batched = scope.outbox.filter((m) => m.type === 'BATCH') as Array<{
      payload: { messages: Array<{ type: 'FRAGMENT'; payload: { id: string; html: string } }> };
    }>;
    const fragments = batched
      .flatMap((entry) => entry.payload.messages)
      .filter((entry) => entry.type === 'FRAGMENT' && entry.payload.id === button!.id);
    expect(fragments.at(-1)?.payload.html).not.toContain('aria-busy="true"');
  });

  it('dispatches table row click handler with row data', async () => {
    const scope = createConnectionScope('exec-row');
    const ui = new UIContext(scope);
    const table = ui.table([{ id: 'r1', name: 'row' }], { columns: ['id', 'name'] });
    const rowId = table.props.rows[0]!.id;
    const onClick = vi.fn();
    table.onRowClick(onClick);
    scope.outbox.length = 0;

    handleClientEvent(scope, {
      id: table.id,
      event: 'click',
      value: rowId,
    });

    await vi.waitFor(() => {
      expect(onClick).toHaveBeenCalledWith({ id: 'r1', name: 'row' });
    });
  });

  it('routes tabs change through handle.update and updates active value', async () => {
    const scope = createConnectionScope('exec-tabs');
    const ui = new UIContext(scope);
    const tabs = ui.tabs([
      { label: 'A', content: (ctx) => ctx.text('tab a') },
      { label: 'B', content: (ctx) => ctx.text('tab b') },
    ], { defaultTab: 'A' });
    scope.outbox.length = 0;

    handleClientEvent(scope, {
      id: tabs.id,
      event: 'change',
      value: 'B',
    });

    expect(tabs.value).toBe('B');
    await vi.waitFor(() => {
      const fragment = scope.outbox
        .filter((message) => message.type === 'BATCH')
        .flatMap((message) => (message as {
          payload: { messages: Array<{ type: 'FRAGMENT'; payload: { id: string; html: string } }> };
        }).payload.messages)
        .find((entry) => entry.type === 'FRAGMENT' && entry.payload.id === tabs.id);
      expect(fragment).toBeDefined();
      expect(fragment?.payload.html).toContain('data-lk-tab-target="B"');
      expect(fragment?.payload.html).toContain('aria-selected="true"');
    });
  });

  it('routes filmStrip and beforeAfter change events into fragment updates', async () => {
    const scope = createConnectionScope('exec-phase3-media');
    const ui = new UIContext(scope);
    ui.filmStrip(['/a.png', '/b.png'], { selectedIndex: 0 });
    ui.beforeAfter('/before.png', '/after.png', { initialPosition: 40 });

    const film = scope.getHandle('filmStrip-1');
    const beforeAfter = scope.getHandle('beforeAfter-1');
    expect(film).toBeDefined();
    expect(beforeAfter).toBeDefined();
    scope.outbox.length = 0;

    handleClientEvent(scope, {
      id: film!.id,
      event: 'change',
      value: 1,
    });
    handleClientEvent(scope, {
      id: beforeAfter!.id,
      event: 'change',
      value: 72,
    });

    await vi.waitFor(() => {
      const fragments = scope.outbox
        .filter((message) => message.type === 'BATCH')
        .flatMap((message) => (message as {
          payload: { messages: Array<{ type: 'FRAGMENT'; payload: { id: string; html: string } }> };
        }).payload.messages)
        .filter((entry) => entry.type === 'FRAGMENT');
      expect(fragments.some((entry) => entry.payload.id === film!.id && entry.payload.html.includes('data-lk-index="1"'))).toBe(true);
      expect(fragments.some((entry) => entry.payload.id === beforeAfter!.id && entry.payload.html.includes('value="72"'))).toBe(true);
    });
  });
});
