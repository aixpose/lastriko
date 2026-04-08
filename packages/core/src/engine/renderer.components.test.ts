import { describe, expect, it } from 'vitest';
import { renderComponent, renderPage } from './renderer';
import type {
  AnyComponentHandle,
  ButtonHandle,
  ChatHandle,
  FileUploadHandle,
  MetricHandle,
  NumberInputHandle,
  ProgressHandle,
  PromptEditorHandle,
  SelectHandle,
  SliderHandle,
  StreamHandle,
  TableHandle,
  TextHandle,
  TextInputHandle,
  ToggleHandle,
} from '../components/types';

function textHandle(id: string, content: string): TextHandle {
  return {
    id,
    type: 'text',
    props: { content },
    get value() {
      return content;
    },
    update(next: string) {
      content = next;
      this.props.content = next;
    },
  };
}

describe('renderComponent — Phase 2 surface', () => {
  it('renders every component type with data-lk-id and escaped user text', () => {
    const malicious = '<script>x</script>';
    const handles: AnyComponentHandle[] = [
      textHandle('text-1', malicious),
      {
        id: 'button-1',
        type: 'button',
        props: { label: malicious, loading: false, variant: 'secondary', onClick: () => {}, disabled: false },
        get value() {
          return false;
        },
        update: () => {},
        setLoading: () => {},
      } as ButtonHandle,
      {
        id: 'textInput-1',
        type: 'textInput',
        props: { label: 'L', value: malicious, multiline: false },
        get value() {
          return this.props.value;
        },
        update: () => {},
      } as TextInputHandle,
      {
        id: 'numberInput-1',
        type: 'numberInput',
        props: { label: 'N', value: 3, min: 0, max: 10 },
        get value() {
          return this.props.value;
        },
        update: () => {},
      } as NumberInputHandle,
      {
        id: 'slider-1',
        type: 'slider',
        props: { label: 'S', min: 0, max: 1, step: 0.1, value: 0.5, showValue: true },
        get value() {
          return this.props.value;
        },
        update: () => {},
      } as SliderHandle,
      {
        id: 'toggle-1',
        type: 'toggle',
        props: { label: 'T', value: true },
        get value() {
          return this.props.value;
        },
        update: () => {},
      } as ToggleHandle,
      {
        id: 'select-1',
        type: 'select',
        props: {
          label: 'Sel',
          value: 'a',
          options: [{ label: malicious, value: 'a' }],
        },
        get value() {
          return this.props.value;
        },
        update: () => {},
      } as SelectHandle,
      {
        id: 'fileUpload-1',
        type: 'fileUpload',
        props: { label: 'F', value: null, dragDrop: true, maxSize: 1 },
        get value() {
          return this.props.value;
        },
        update: () => {},
      } as FileUploadHandle,
      {
        id: 'promptEditor-1',
        type: 'promptEditor',
        props: {
          label: 'P',
          value: 'x',
          multiline: true,
          rows: 2,
          showCharCount: true,
        },
        get value() {
          return this.props.value;
        },
        update: () => {},
        interpolate: () => '',
      } as PromptEditorHandle,
      {
        id: 'markdown-1',
        type: 'markdown',
        props: { content: malicious },
        value: undefined,
        update: () => {},
      } as AnyComponentHandle,
      {
        id: 'image-1',
        type: 'image',
        props: { src: null, alt: malicious },
        value: undefined,
        update: () => {},
      } as AnyComponentHandle,
      {
        id: 'imageGrid-1',
        type: 'imageGrid',
        props: { items: [{ src: 'https://ex.test/x', alt: malicious }] },
        value: undefined,
        update: () => {},
      } as AnyComponentHandle,
      {
        id: 'code-1',
        type: 'code',
        props: { content: malicious, lang: 'ts' },
        value: undefined,
        update: () => {},
      } as AnyComponentHandle,
      {
        id: 'json-1',
        type: 'json',
        props: { data: { evil: malicious }, label: malicious },
        value: undefined,
        update: () => {},
      } as AnyComponentHandle,
      {
        id: 'table-1',
        type: 'table',
        props: {
          columns: ['c'],
          rows: [{ id: 'r1', data: { c: malicious } }],
          striped: true,
          emptyMessage: 'empty',
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
      } as TableHandle,
      {
        id: 'metric-1',
        type: 'metric',
        props: { label: malicious, value: '1', delta: -5, deltaLabel: malicious },
        get value() {
          return this.props.value;
        },
        update: () => {},
      } as MetricHandle,
      {
        id: 'progress-1',
        type: 'progress',
        props: { value: 50, label: malicious },
        get value() {
          return this.props.value;
        },
        update: () => {},
      } as ProgressHandle,
      {
        id: 'progress-2',
        type: 'progress',
        props: { value: null },
        get value() {
          return this.props.value;
        },
        update: () => {},
      } as ProgressHandle,
      {
        id: 'alert-1',
        type: 'alert',
        props: { message: malicious, type: 'warning', title: malicious },
        value: undefined,
        update: () => {},
      } as AnyComponentHandle,
      {
        id: 'loading-1',
        type: 'loading',
        props: { message: malicious, mode: 'inline', size: 'md' },
        value: undefined,
        update: () => {},
      } as AnyComponentHandle,
      {
        id: 'streamText-1',
        type: 'streamText',
        props: { text: malicious, isStreaming: true, format: 'plain', cursor: true },
        get value() {
          return this.props.text;
        },
        get text() {
          return this.props.text;
        },
        get isStreaming() {
          return this.props.isStreaming;
        },
        append: () => {},
        done: () => {},
        clear: () => {},
        update: () => {},
      } as StreamHandle,
      {
        id: 'streamText-2',
        type: 'streamText',
        props: { text: 'hi', isStreaming: false, format: 'plain', cursor: true },
        get value() {
          return this.props.text;
        },
        get text() {
          return this.props.text;
        },
        get isStreaming() {
          return this.props.isStreaming;
        },
        append: () => {},
        done: () => {},
        clear: () => {},
        update: () => {},
      } as StreamHandle,
      {
        id: 'chatUI-1',
        type: 'chatUI',
        props: {
          messages: [{ role: 'user', content: malicious, timestamp: 1 }],
        },
        get value() {
          return this.props.messages;
        },
        get lastMessage() {
          return this.props.messages[0] ?? null;
        },
        update: () => {},
        addMessage: () => {},
        clear: () => {},
      } as ChatHandle,
    ];

    for (const h of handles) {
      const html = renderComponent(h);
      expect(html).toContain(`data-lk-id="${h.id}"`);
      expect(html).not.toContain('<script>');
    }
  });

  it('renders shell with only main when header/sidebar/footer are empty', () => {
    const handles: AnyComponentHandle[] = [
      textHandle('text-1', 'main only'),
      {
        id: 'shell-1',
        type: 'shell',
        props: {
          regions: { header: [], sidebar: [], main: ['text-1'], footer: [] },
          opts: { sidebarPosition: 'right', sidebarWidth: '200px' },
        },
        value: undefined,
        update: () => {},
      } as AnyComponentHandle,
    ];
    const html = renderPage(handles);
    expect(html).toContain('lk-shell-main');
    expect(html).not.toContain('lk-shell-header');
    expect(html).not.toContain('lk-shell-sidebar');
    expect(html).not.toContain('lk-shell-footer');
    expect(html).toContain('lk-shell--sidebar-right');
  });

  it('renders grid with numeric cols in style', () => {
    const handles: AnyComponentHandle[] = [
      textHandle('text-1', 'a'),
      textHandle('text-2', 'b'),
      {
        id: 'grid-1',
        type: 'grid',
        props: {
          cells: [['text-1'], ['text-2']],
          opts: { cols: 1, gap: 8 },
        },
        value: undefined,
        update: () => {},
      } as AnyComponentHandle,
    ];
    const html = renderPage(handles);
    expect(html).toContain('grid-template-columns:repeat(1, minmax(0, 1fr))');
    expect(html).toContain('gap:8px');
  });
});
