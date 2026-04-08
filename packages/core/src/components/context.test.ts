import { describe, expect, it } from 'vitest';
import { UIContext } from './context';
import { createConnectionScope } from './registry';

describe('uiContext', () => {
  it('creates stable ids per component type', () => {
    const scope = createConnectionScope('c1');
    const ui = new UIContext(scope);

    const text1 = ui.text('hello');
    const text2 = ui.text('world');
    const button = ui.button('Run', () => {});
    const input = ui.textInput('Name');

    expect(text1.id).toBe('text-1');
    expect(text2.id).toBe('text-2');
    expect(button.id).toBe('button-1');
    expect(input.id).toBe('textInput-1');
  });

  it('input change updates value atom and emits FRAGMENT', () => {
    const scope = createConnectionScope('c2');
    const ui = new UIContext(scope);
    const slider = ui.slider('Temperature', { min: 0, max: 2, default: 0.7 });

    slider.update({ value: 1.2 });

    expect(slider.value).toBe(1.2);
    expect(scope.outbox).toHaveLength(1);
    expect(scope.outbox[0]?.type).toBe('FRAGMENT');
  });

  it('table handles support prepend, row.update, remove', () => {
    const scope = createConnectionScope('c3');
    const ui = new UIContext(scope);
    const table = ui.table([], { columns: ['name', 'status'] });

    const row = table.prepend({ name: 'exp-1', status: 'queued' });
    expect(table.rowCount).toBe(1);

    row.update({ status: 'done' });
    expect(table.props.rows[0]?.data.status).toBe('done');

    row.remove();
    expect(table.rowCount).toBe(0);
  });

  it('streamText emits STREAM_CHUNK sequence and done marker', () => {
    const scope = createConnectionScope('c4');
    const ui = new UIContext(scope);
    const stream = ui.streamText({ format: 'plain' });

    stream.append('Hello');
    stream.append(' world');
    stream.done();

    const chunks = scope.outbox.filter((message) => message.type === 'STREAM_CHUNK');
    expect(chunks).toHaveLength(3);
    expect((chunks[0]?.payload as { chunk: string }).chunk).toBe('Hello');
    expect((chunks[1]?.payload as { chunk: string }).chunk).toBe(' world');
    expect((chunks[2]?.payload as { done: boolean }).done).toBe(true);
  });

  it('chatUI stores and clears connection-scoped message history', () => {
    const scope = createConnectionScope('c5');
    const ui = new UIContext(scope);
    const chat = ui.chatUI();

    chat.addMessage('user', 'hi');
    chat.addMessage('assistant', 'hello');
    expect(chat.value).toHaveLength(2);
    expect(chat.lastMessage?.content).toBe('hello');

    chat.clear();
    expect(chat.value).toHaveLength(0);
  });

  it('promptEditor interpolate replaces template variables', () => {
    const scope = createConnectionScope('c6');
    const ui = new UIContext(scope);
    const prompt = ui.promptEditor({ default: 'Write a {{tone}} note about {{topic}}.' });

    const finalText = prompt.interpolate({ tone: 'formal', topic: 'safety' });
    expect(finalText).toBe('Write a formal note about safety.');
  });

  it('tabs handle supports setActive for enabled tabs only', () => {
    const scope = createConnectionScope('c7');
    const ui = new UIContext(scope);
    const tabs = ui.tabs(
      [
        { label: 'One', content: (t) => t.text('first') },
        { label: 'Two', content: (t) => t.text('second'), disabled: true },
      ],
      { defaultTab: 'One' },
    );

    expect(tabs.value).toBe('One');

    tabs.setActive('Two');
    expect(tabs.value).toBe('One');

    tabs.setActive('One');
    expect(tabs.value).toBe('One');
    expect(scope.outbox.filter((message) => message.type === 'FRAGMENT').length).toBeGreaterThan(0);
  });

  it('supports shell/grid helper methods and disconnect hook', () => {
    const scope = createConnectionScope('c8');
    const ui = new UIContext(scope);
    let disconnected = false;
    ui.onDisconnect(() => {
      disconnected = true;
    });

    ui.shell({
      header: (h) => {
        h.text('header');
      },
      sidebar: (s) => {
        s.text('sidebar');
      },
      main: (m) => {
        m.grid([
          (g1) => {
            g1.code('const x = 1', { lang: 'ts' });
            g1.json({ ok: true }, { label: 'payload' });
          },
          (g2) => {
            g2.alert('info');
            g2.loading('loading');
          },
        ], { cols: 2, gap: 8 });
        m.card('card', (c) => {
          c.divider({ label: 'sep' });
          c.spacer('sm');
        });
      },
      footer: (f) => {
        f.text('footer');
      },
    }, { sidebarPosition: 'right', sidebarWidth: '300px' });

    const handles = scope.listHandles();
    expect(handles.some((h) => h.type === 'shell')).toBe(true);
    expect(handles.some((h) => h.type === 'grid')).toBe(true);
    expect(handles.some((h) => h.type === 'code')).toBe(true);
    expect(handles.some((h) => h.type === 'json')).toBe(true);
    expect(handles.some((h) => h.type === 'card')).toBe(true);
    expect(handles.some((h) => h.type === 'divider')).toBe(true);
    expect(handles.some((h) => h.type === 'spacer')).toBe(true);
    expect(handles.some((h) => h.type === 'alert')).toBe(true);
    expect(handles.some((h) => h.type === 'loading')).toBe(true);

    scope.destroy();
    expect(disconnected).toBe(true);
  });
});
