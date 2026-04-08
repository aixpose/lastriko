import bash from '@shikijs/langs/bash';
import javascript from '@shikijs/langs/javascript';
import json from '@shikijs/langs/json';
import markdown from '@shikijs/langs/markdown';
import python from '@shikijs/langs/python';
import tsx from '@shikijs/langs/tsx';
import typescript from '@shikijs/langs/typescript';
import githubDark from '@shikijs/themes/github-dark';
import { createHighlighterCoreSync } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';

const DEFAULT_LANG = 'markdown';
const DEFAULT_THEME = 'github-dark';

const LANGUAGE_ALIASES: Record<string, string> = {
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  py: 'python',
  md: 'markdown',
  text: 'markdown',
  txt: 'markdown',
  shell: 'bash',
  sh: 'bash',
};

const SUPPORTED_LANGUAGES = new Set([
  'javascript',
  'typescript',
  'tsx',
  'json',
  'bash',
  'markdown',
  'python',
  'markdown',
]);

const highlighter = createHighlighterCoreSync({
  themes: [githubDark],
  langs: [javascript, typescript, tsx, json, markdown, python, bash],
  engine: createJavaScriptRegexEngine(),
});

function normalizeLanguage(input?: string): string {
  if (!input) {
    return DEFAULT_LANG;
  }
  const lower = input.toLowerCase();
  const normalized = LANGUAGE_ALIASES[lower] ?? lower;
  return SUPPORTED_LANGUAGES.has(normalized) ? normalized : DEFAULT_LANG;
}

function highlightCode(content: string, lang?: string): string {
  const normalized = normalizeLanguage(lang);
  try {
    return highlighter.codeToHtml(content, { lang: normalized, theme: DEFAULT_THEME });
  } catch {
    return highlighter.codeToHtml(content, { lang: DEFAULT_LANG, theme: DEFAULT_THEME });
  }
}

export function renderCodeHtml(content: string, lang: string): string {
  const highlighted = highlightCode(content, lang);
  const match = highlighted.match(/<code[^>]*>([\s\S]*?)<\/code>/i);
  if (!match) {
    return '';
  }
  return match[1];
}
