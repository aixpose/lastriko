import { describe, expect, it } from 'vitest';
import { renderComponent, renderPage } from './renderer';
import type { AnyComponentHandle, TextHandle } from '../components/types';

function textHandle(content: string): TextHandle {
  return {
    id: 'text-1',
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

describe('renderer', () => {
  it('includes data-lk-id and escapes text', () => {
    const html = renderComponent(textHandle('<img src=x onerror=alert(1)>'));
    expect(html).toContain('data-lk-id="text-1"');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('renders input and stream components with expected markers', () => {
    const handles: AnyComponentHandle[] = [
      {
        id: 'textInput-1',
        type: 'textInput',
        props: { label: 'Name', value: 'Ada', multiline: false },
        get value() {
          return this.props.value;
        },
        update: () => {},
      },
      {
        id: 'streamText-1',
        type: 'streamText',
        props: { text: 'hello', isStreaming: true, format: 'plain', cursor: true },
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
      },
    ] as unknown as AnyComponentHandle[];

    const html = renderPage(handles);
    expect(html).toContain('data-lk-id="textInput-1"');
    expect(html).toContain('data-lk-stream-body');
    expect(html).toContain('data-lk-stream-cursor');
  });

  it('renders shell composition containing child content', () => {
    const handles: AnyComponentHandle[] = [
      textHandle('inside shell'),
      {
        id: 'shell-1',
        type: 'shell',
        props: {
          regions: { header: [], sidebar: [], main: ['text-1'], footer: [] },
          opts: { sidebarPosition: 'left', sidebarWidth: '260px' },
        },
        value: undefined,
        update: () => {},
      },
    ] as unknown as AnyComponentHandle[];

    const html = renderPage(handles);
    expect(html).toContain('lk-shell');
    expect(html).toContain('inside shell');
    expect(html).toContain('class="lk-shell');
    expect(html).toContain('<main class="lk-shell-main"><p class="lk-text"');
  });
});
