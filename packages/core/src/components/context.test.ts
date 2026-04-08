import { describe, expect, it } from 'vitest';
import { UIContext } from './context';
import { createConnectionScope } from './registry';

describe('uiContext Phase 3', () => {
  it('creates and updates phase 3 input handles', () => {
    const scope = createConnectionScope('p3-ctx-inputs');
    const ui = new UIContext(scope);

    const multi = ui.multiSelect('Tags', ['a', 'b', 'c'], { defaults: ['a', 'c'], maxSelections: 2 });
    const color = ui.colorPicker('Color', { default: '#112233' });
    const date = ui.dateInput('Date', { default: '2026-04-08' });

    expect(multi.value).toEqual(['a', 'c']);
    expect(color.value).toBe('#112233');
    expect(date.value).toBe('2026-04-08');

    multi.update({ value: ['b', 'c', 'a'] });
    color.update({ value: '#abcdef' });
    date.update({ value: '2026-05-01' });

    expect(multi.value).toEqual(['b', 'c']);
    expect(color.value).toBe('#abcdef');
    expect(date.value).toBe('2026-05-01');
  });

  it('creates advanced passive components', () => {
    const scope = createConnectionScope('p3-ctx-passive');
    const ui = new UIContext(scope);

    ui.video('https://example.com/a.mp4', { src: 'https://example.com/a.mp4', autoplay: true });
    ui.audio('https://example.com/a.mp3', { src: 'https://example.com/a.mp3', label: 'Audio demo' });
    ui.diff('a\nb', 'a\nc');
    ui.accordion([{ label: 'S1', defaultOpen: true, content: (s) => s.text('one') }]);
    ui.filmStrip(['https://example.com/1.png']);
    ui.beforeAfter('https://example.com/b.png', 'https://example.com/a.png');

    const types = new Set(scope.listHandles().map((h) => h.type));
    expect(types.has('video')).toBe(true);
    expect(types.has('audio')).toBe(true);
    expect(types.has('diff')).toBe(true);
    expect(types.has('accordion')).toBe(true);
    expect(types.has('filmStrip')).toBe(true);
    expect(types.has('beforeAfter')).toBe(true);
  });

  it('supports fullscreen and modelCompare state updates', () => {
    const scope = createConnectionScope('p3-ctx-stateful');
    const ui = new UIContext(scope);

    const fullscreen = ui.fullscreen((f) => {
      f.text('full');
    }, { trigger: 'manual' });
    const model = ui.modelCompare(
      [{ label: 'M1', model: 'x', provider: 'p' }],
      { prompt: 'hello' },
    );

    expect(model.value.results.M1).toBe('');
    fullscreen.open();
    expect(fullscreen.value).toBe(true);
    fullscreen.close();
    expect(fullscreen.value).toBe(false);

    model.update({
      value: {
        results: { M1: 'ok' },
        isStreaming: { M1: false },
        errors: { M1: null },
        latencies: { M1: 12 },
      },
    });
    expect(model.results.M1).toBe('ok');
  });

  it('parameterPanel maps schema to child controls', () => {
    const scope = createConnectionScope('p3-ctx-params');
    const ui = new UIContext(scope);

    const params = ui.parameterPanel({
      temperature: { type: 'number', min: 0, max: 2, default: 0.7 },
      stream: { type: 'boolean', default: true },
      model: { type: 'select', options: ['a', 'b'], default: 'a' },
      note: { type: 'string', default: 'x' },
    }, { title: 'Params', collapsible: true });

    expect(params.value.temperature).toBe(0.7);
    expect(params.value.stream).toBe(true);
    expect(params.value.model).toBe('a');
    expect(params.value.note).toBe('x');

    params.update({
      value: {
        temperature: 1.1,
        stream: false,
        model: 'b',
        note: 'updated',
      },
    });

    expect(params.value.temperature).toBe(1.1);
    expect(params.value.stream).toBe(false);
    expect(params.value.model).toBe('b');
    expect(params.value.note).toBe('updated');
  });
});
