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
      const fragments = scope.outbox.filter(
        (m) => m.type === 'FRAGMENT' && (m as { payload: { id: string } }).payload.id === button!.id,
      );
      expect(fragments.length).toBeGreaterThanOrEqual(2);
    });

    const fragments = scope.outbox.filter(
      (m) => m.type === 'FRAGMENT' && (m as { payload: { id: string } }).payload.id === button!.id,
    ) as Array<{ type: 'FRAGMENT'; payload: { html: string } }>;
    expect(fragments.some((f) => f.payload.html.includes('aria-busy="true"'))).toBe(true);
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

  it('routes tabs change through handle.update and updates active value', () => {
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
    const fragment = scope.outbox.find(
      (message) => message.type === 'FRAGMENT'
        && (message as { payload: { id: string } }).payload.id === tabs.id,
    ) as { payload: { html: string } } | undefined;
    expect(fragment).toBeDefined();
    expect(fragment?.payload.html).toContain('data-lk-tab-target="B"');
    expect(fragment?.payload.html).toContain('aria-selected="true"');
  });
});
