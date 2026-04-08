import { describe, expect, it } from 'vitest';
import { renderComponent } from './renderer';
import type { AnyComponentHandle, FullscreenHandle, ModelCompareHandle, ParameterPanelHandle, TableHandle, TabsHandle, TextHandle } from '../components/types';

function textHandle(id: string, content: string): TextHandle {
  return {
    id,
    type: 'text',
    props: { content },
    get value() {
      return this.props.content;
    },
    update(next: string) {
      this.props.content = next;
    },
  };
}

describe('renderer phase 3 components', () => {
  it('renders multiSelect, colorPicker, and dateInput', () => {
    const multi = renderComponent({
      id: 'multiSelect-1',
      type: 'multiSelect',
      props: {
        label: 'Models',
        value: ['a'],
        options: [{ label: 'A', value: 'a' }, { label: 'B', value: 'b' }],
      },
      get value() {
        return (this as { props: { value: string[] } }).props.value;
      },
      update: () => {},
    } as unknown as AnyComponentHandle);
    expect(multi).toContain('data-lk-kind="multiSelect"');
    expect(multi).toContain('type="checkbox"');

    const color = renderComponent({
      id: 'colorPicker-1',
      type: 'colorPicker',
      props: { label: 'Accent', value: '#ff0000', format: 'hex' },
      get value() {
        return (this as { props: { value: string } }).props.value;
      },
      update: () => {},
    } as unknown as AnyComponentHandle);
    expect(color).toContain('type="color"');
    expect(color).toContain('#ff0000');

    const date = renderComponent({
      id: 'dateInput-1',
      type: 'dateInput',
      props: { label: 'When', value: '2026-04-08', type: 'date' },
      get value() {
        return (this as { props: { value: string } }).props.value;
      },
      update: () => {},
    } as unknown as AnyComponentHandle);
    expect(date).toContain('type="date"');
    expect(date).toContain('2026-04-08');
  });

  it('renders video audio and diff', () => {
    const video = renderComponent({
      id: 'video-1',
      type: 'video',
      props: { src: 'https://example.com/video.mp4', controls: true, autoplay: true, muted: true, loop: false, width: '100%' },
      value: undefined,
      update: () => {},
    } as unknown as AnyComponentHandle);
    expect(video).toContain('<video');
    expect(video).toContain('loading="lazy"');

    const audio = renderComponent({
      id: 'audio-1',
      type: 'audio',
      props: { src: 'https://example.com/audio.mp3', controls: true, label: 'audio' },
      value: undefined,
      update: () => {},
    } as unknown as AnyComponentHandle);
    expect(audio).toContain('<audio');

    const diff = renderComponent({
      id: 'diff-1',
      type: 'diff',
      props: { before: 'a\nb', after: 'a\nc', mode: 'split', beforeLabel: 'Before', afterLabel: 'After' },
      value: undefined,
      update: () => {},
    } as unknown as AnyComponentHandle);
    expect(diff).toContain('lk-diff');
    expect(diff).toContain('lk-diff-line removed');
    expect(diff).toContain('lk-diff-line added');
  });

  it('renders accordion and fullscreen containers', () => {
    const byId = new Map<string, AnyComponentHandle>();
    byId.set('text-1', textHandle('text-1', 'section text') as unknown as AnyComponentHandle);
    const accordion = renderComponent({
      id: 'accordion-1',
      type: 'accordion',
      props: {
        sections: [{ label: 'Section', defaultOpen: true, ids: ['text-1'] }],
        opts: { allowMultiple: false },
      },
      value: undefined,
      update: () => {},
    } as unknown as AnyComponentHandle, byId);
    expect(accordion).toContain('lk-accordion');
    expect(accordion).toContain('<details');

    const fullscreen = renderComponent({
      id: 'fullscreen-1',
      type: 'fullscreen',
      props: {
        ids: ['text-1'],
        trigger: 'button',
        label: 'Open fullscreen',
        open: true,
      },
      get value() {
        return true;
      },
      update: () => {},
      open: () => {},
      close: () => {},
    } as FullscreenHandle, byId);
    expect(fullscreen).toContain('lk-fullscreen');
    expect(fullscreen).toContain('lk-fullscreen-overlay');
  });

  it('renders modelCompare parameterPanel filmStrip and beforeAfter', () => {
    const compare = renderComponent({
      id: 'modelCompare-1',
      type: 'modelCompare',
      props: {
        models: [{ label: 'A', model: 'm1', provider: 'p1' }],
        prompt: 'hello',
        value: {
          results: { A: 'ok' },
          isStreaming: { A: false },
          errors: { A: null },
          latencies: { A: 12 },
        },
      },
      get value() {
        return this.props.value;
      },
      get results() {
        return this.props.value.results;
      },
      get isStreaming() {
        return this.props.value.isStreaming;
      },
      get errors() {
        return this.props.value.errors;
      },
      get latencies() {
        return this.props.value.latencies;
      },
      update: () => {},
    } as ModelCompareHandle);
    expect(compare).toContain('lk-model-compare');
    expect(compare).toContain('A');

    const byId = new Map<string, AnyComponentHandle>();
    byId.set('textInput-1', {
      id: 'textInput-1',
      type: 'textInput',
      props: { label: 'Prompt', value: 'x' },
      get value() {
        return (this as { props: { value: string } }).props.value;
      },
      update: () => {},
    } as unknown as AnyComponentHandle);

    const panel = renderComponent({
      id: 'parameterPanel-1',
      type: 'parameterPanel',
      props: {
        schema: { prompt: { type: 'string' } },
        ids: ['textInput-1'],
        value: { prompt: 'x' },
        title: 'Params',
      },
      get value() {
        return this.props.value;
      },
      update: () => {},
    } as ParameterPanelHandle, byId);
    expect(panel).toContain('lk-parameter-panel');
    expect(panel).toContain('Params');

    const film = renderComponent({
      id: 'filmStrip-1',
      type: 'filmStrip',
      props: { images: [{ src: '/a.png', alt: 'a' }], height: 90, selectedIndex: 0, zoom: true, showCaptions: true },
      value: undefined,
      update: () => {},
    } as unknown as AnyComponentHandle);
    expect(film).toContain('lk-film-strip');

    const beforeAfter = renderComponent({
      id: 'beforeAfter-1',
      type: 'beforeAfter',
      props: { before: '/before.png', after: '/after.png', beforeLabel: 'Before', afterLabel: 'After', initialPosition: 40, orientation: 'horizontal' },
      value: undefined,
      update: () => {},
    } as unknown as AnyComponentHandle);
    expect(beforeAfter).toContain('lk-before-after');
    expect(beforeAfter).toContain('class="lk-before-after-handle"');
  });

  it('renders virtualized table when row count is large', () => {
    const rows = Array.from({ length: 120 }, (_, i) => ({ id: `r${i}`, data: { idx: i } }));
    const table = renderComponent({
      id: 'table-1',
      type: 'table',
      props: {
        columns: ['idx'],
        rows,
        striped: true,
        emptyMessage: 'none',
        getOnRowClick: () => null,
      },
      value: undefined,
      get rowCount() {
        return this.props.rows.length;
      },
      update: () => {},
      append: () => ({ id: 'x', update: () => {}, remove: () => {} }),
      prepend: () => ({ id: 'x', update: () => {}, remove: () => {} }),
      remove: () => {},
      onRowClick: () => {},
    } as TableHandle);
    expect(table).toContain('data-lk-virtualized="true"');
    expect(table).toContain('data-lk-table-rows');
  });

  it('renders tabs with proper role wiring', () => {
    const byId = new Map<string, AnyComponentHandle>();
    byId.set('text-1', textHandle('text-1', 'A') as unknown as AnyComponentHandle);
    const html = renderComponent({
      id: 'tabs-1',
      type: 'tabs',
      props: {
        tabs: [{ label: 'One', disabled: false, ids: ['text-1'] }],
        active: 'One',
      },
      get value() {
        return 'One';
      },
      update: () => {},
      setActive: () => {},
    } as TabsHandle, byId);
    expect(html).toContain('<nav class="lk-tab-nav" role="tablist">');
    expect(html).toContain('role="tabpanel"');
  });

  it('escapes potentially unsafe text', () => {
    const html = renderComponent({
      id: 'text-unsafe',
      type: 'text',
      props: { content: '<script>alert(1)</script>' },
      get value() {
        return this.props.content;
      },
      update: () => {},
    } as TextHandle);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
