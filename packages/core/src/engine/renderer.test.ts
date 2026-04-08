import { describe, expect, it } from 'vitest';
import { renderComponent } from './renderer';
import type { TextHandle } from '../components/types';

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

describe('renderComponent', () => {
  it('includes data-lk-id on root element', () => {
    const html = renderComponent(textHandle('hello'));
    expect(html).toContain('data-lk-id="text-1"');
  });

  it('escapes user content', () => {
    const html = renderComponent(textHandle('<img src=x onerror=alert(1)>'));
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });
});
