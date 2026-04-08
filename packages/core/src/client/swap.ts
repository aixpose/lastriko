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
