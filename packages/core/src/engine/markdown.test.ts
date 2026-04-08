import { describe, expect, it } from 'vitest';
import { renderMarkdownToSafeHtml } from './markdown';

describe('renderMarkdownToSafeHtml', () => {
  it('renders headings and bold', () => {
    const html = renderMarkdownToSafeHtml('## Hi\n**bold**');
    expect(html).toContain('<h2');
    expect(html).toContain('<strong>bold</strong>');
  });

  it('strips script tags from untrusted markdown', () => {
    const html = renderMarkdownToSafeHtml('x <script>alert(1)</script>');
    expect(html).not.toContain('<script>');
  });
});
