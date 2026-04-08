import { describe, expect, it } from 'vitest';
import { renderCodeHtml } from './code-highlight';

describe('code highlighting', () => {
  it('returns highlighted html for supported language', () => {
    const html = renderCodeHtml('const x = 1', 'ts');
    expect(html).toContain('<span');
    expect(html).toContain('const');
  });

  it('returns highlighted output even for unknown language via fallback', () => {
    const html = renderCodeHtml('<script>', 'unknown-lang');
    expect(html).toContain('script');
    expect(html).toContain('<span');
  });
});
