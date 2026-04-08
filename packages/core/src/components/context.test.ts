import { describe, expect, it } from 'vitest';
import { UIContext } from './context';
import { createConnectionScope } from './registry';

describe('uI context', () => {
  it('creates stable ids per scope/type', () => {
    const scope = createConnectionScope('c1');
    const ui = new UIContext(scope);
    const text1 = ui.text('hello');
    const text2 = ui.text('world');
    const button = ui.button('Run', () => {});

    expect(text1.id).toBe('text-1');
    expect(text2.id).toBe('text-2');
    expect(button.id).toBe('button-1');
    expect(scope.outbox).toHaveLength(0);
  });

  it('text.update emits FRAGMENT', () => {
    const scope = createConnectionScope('c2');
    const ui = new UIContext(scope);
    const text = ui.text('before');

    text.update('after');

    expect(scope.outbox).toHaveLength(1);
    expect(scope.outbox[0]?.type).toBe('FRAGMENT');
    expect((scope.outbox[0]?.payload as { id: string }).id).toBe(text.id);
    expect((scope.outbox[0]?.payload as { html: string }).html).toContain('after');
  });

  it('button.setLoading emits disabled fragment', () => {
    const scope = createConnectionScope('c3');
    const ui = new UIContext(scope);
    const button = ui.button('Run', () => {});

    button.setLoading(true);

    expect(scope.outbox).toHaveLength(1);
    expect((scope.outbox[0]?.payload as { id: string }).id).toBe(button.id);
    expect((scope.outbox[0]?.payload as { html: string }).html).toContain('disabled');
  });

  it('destroy runs cleanup and clears scope state', () => {
    const scope = createConnectionScope('cleanup');
    let cleaned = false;
    scope.onCleanup(() => {
      cleaned = true;
    });

    const ui = new UIContext(scope);
    ui.text('value');
    scope.getAtom('x', 1);
    scope.destroy();

    expect(cleaned).toBe(true);
    expect(scope.handles.size).toBe(0);
    expect(scope.atoms.size).toBe(0);
  });
});
