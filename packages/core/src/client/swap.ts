import type { RenderMessage } from '../engine/messages';

export function applyRender(payload: RenderMessage['payload']): void {
  const root = document.getElementById('lk-root');
  if (!root) {
    return;
  }
  root.innerHTML = payload.html;
  document.title = payload.title;
  document.documentElement.setAttribute('data-theme', payload.theme);
}

export function applyFragmentSwap(id: string, html: string): void {
  const target = document.querySelector<HTMLElement>(`[data-lk-id="${id}"]`);
  if (!target) {
    return;
  }
  target.outerHTML = html;
}

function markdownToHtml(input: string): string {
  const escaped = input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
  return escaped.replaceAll('\n', '<br />');
}

export function applyStreamChunk(
  id: string,
  chunk: string,
  done: boolean,
  format: 'plain' | 'markdown',
): void {
  const container = document.querySelector<HTMLElement>(`[data-lk-id="${id}"]`);
  if (!container) {
    return;
  }
  const body = container.querySelector<HTMLElement>('[data-lk-stream-body]');
  if (!body) {
    return;
  }

  const current = body.dataset.lkText ?? '';
  const next = `${current}${chunk}`;
  body.dataset.lkText = next;
  if (format === 'markdown') {
    body.innerHTML = markdownToHtml(next);
  } else {
    body.textContent = next;
  }

  const cursor = container.querySelector<HTMLElement>('[data-lk-stream-cursor]');
  if (cursor) {
    cursor.style.display = done ? 'none' : '';
  }
}
