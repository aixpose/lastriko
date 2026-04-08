import { describe, expect, it } from 'vitest';
import { renderComponent, renderPage } from './renderer';
import type { AnyComponentHandle, ComponentHandle, TextHandle } from '../components/types';

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

  it('renders markdown with parsed bold (not literal asterisks)', () => {
    const md: AnyComponentHandle = {
      id: 'markdown-1',
      type: 'markdown',
      props: { content: '**x**' },
      value: undefined,
      update: () => {},
    } as AnyComponentHandle;
    const html = renderComponent(md);
    expect(html).toContain('<strong>x</strong>');
    expect(html).not.toContain('**x**');
  });

  it('tab buttons omit disabled attribute when tab is enabled', () => {
    const handles: AnyComponentHandle[] = [
      textHandle('a'),
      textHandle('b'),
      {
        id: 'tabs-1',
        type: 'tabs',
        props: {
          active: 'One',
          tabs: [
            { label: 'One', disabled: false, ids: ['text-1'] },
            { label: 'Two', disabled: true, ids: ['text-2'] },
          ],
        },
        get value() {
          return 'One';
        },
        update: () => {},
      } as ComponentHandle<Record<string, unknown>, string>,
    ];
    const html = renderPage(handles);
    const oneOpen = html.match(/<button[^>]*data-lk-tab-target="One"[^>]*>/)?.[0] ?? '';
    const twoOpen = html.match(/<button[^>]*data-lk-tab-target="Two"[^>]*>/)?.[0] ?? '';
    expect(oneOpen).not.toContain('disabled');
    expect(twoOpen).toContain('disabled');
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

  it('does not duplicate shell-owned children even when declared before shell', () => {
    const handles: AnyComponentHandle[] = [
      {
        id: 'text-1',
        type: 'text',
        props: { content: 'owned by shell' },
        get value() {
          return this.props.content;
        },
        update: () => {},
      } as TextHandle,
      {
        id: 'shell-1',
        type: 'shell',
        props: {
          regions: { header: [], sidebar: [], main: ['text-1'], footer: [] },
          opts: {},
        },
        value: undefined,
        update: () => {},
      } as AnyComponentHandle,
    ];

    const html = renderPage(handles);
    const textIdMatches = html.match(/data-lk-id="text-1"/g) ?? [];
    expect(textIdMatches).toHaveLength(1);
  });

  it('does not duplicate tab-owned children when tab appears last', () => {
    const handles: AnyComponentHandle[] = [
      {
        id: 'text-1',
        type: 'text',
        props: { content: 'tab A' },
        get value() {
          return this.props.content;
        },
        update: () => {},
      } as TextHandle,
      {
        id: 'text-2',
        type: 'text',
        props: { content: 'tab B' },
        get value() {
          return this.props.content;
        },
        update: () => {},
      } as TextHandle,
      {
        id: 'tabs-1',
        type: 'tabs',
        props: {
          active: 'A',
          tabs: [
            { label: 'A', disabled: false, ids: ['text-1'] },
            { label: 'B', disabled: false, ids: ['text-2'] },
          ],
        },
        get value() {
          return 'A';
        },
        update: () => {},
      } as ComponentHandle<Record<string, unknown>, string>,
    ];

    const html = renderPage(handles);
    const text1Matches = html.match(/data-lk-id="text-1"/g) ?? [];
    const text2Matches = html.match(/data-lk-id="text-2"/g) ?? [];
    expect(text1Matches).toHaveLength(1);
    expect(text2Matches).toHaveLength(1);
  });

  it('does not duplicate nested container ownership (shell -> tabs -> text)', () => {
    const handles: AnyComponentHandle[] = [
      {
        id: 'text-1',
        type: 'text',
        props: { content: 'nested text' },
        get value() {
          return this.props.content;
        },
        update: () => {},
      } as TextHandle,
      {
        id: 'tabs-1',
        type: 'tabs',
        props: {
          active: 'Main',
          tabs: [{ label: 'Main', disabled: false, ids: ['text-1'] }],
        },
        get value() {
          return 'Main';
        },
        update: () => {},
      } as ComponentHandle<Record<string, unknown>, string>,
      {
        id: 'shell-1',
        type: 'shell',
        props: {
          regions: { header: [], sidebar: [], main: ['tabs-1'], footer: [] },
          opts: {},
        },
        value: undefined,
        update: () => {},
      } as AnyComponentHandle,
    ];

    const html = renderPage(handles);
    const textMatches = html.match(/data-lk-id="text-1"/g) ?? [];
    const tabsMatches = html.match(/data-lk-id="tabs-1"/g) ?? [];
    expect(textMatches).toHaveLength(1);
    expect(tabsMatches).toHaveLength(1);
  });
});
