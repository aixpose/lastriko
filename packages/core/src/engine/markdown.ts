import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

const markdownOptions = { async: false as const, breaks: true, gfm: true };

/**
 * Parse Markdown to HTML and sanitize for safe insertion into the page.
 * Matches DISPLAY.md: marked + tag-allowlist (no raw script/onclick).
 */
export function renderMarkdownToSafeHtml(source: string): string {
  const raw = marked.parse(source, markdownOptions) as string;
  return sanitizeHtml(raw, {
    allowedTags: [
      ...sanitizeHtml.defaults.allowedTags,
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'img',
      'pre',
      'code',
      'del',
      'hr',
      'span',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
    ],
    allowedAttributes: {
      'a': ['href', 'name', 'target', 'rel'],
      'img': ['src', 'alt', 'width', 'height', 'loading', 'title'],
      'code': ['class'],
      '*': ['class'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'data'],
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' }),
    },
  });
}
