import type { BatchMessage, BatchedInnerMessage, RenderMessage } from '../engine/messages';

const SNAPSHOT_KEY = 'lk-hot-reload-snapshot';

export interface HotReloadSnapshot {
  inputs: Record<string, unknown>;
  tabs: Record<string, string>;
  scrollY: number;
  containerScroll: Record<string, number>;
}

function escapeHtml(input: string): string {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll('\'', '&#39;');
}

function markdownToHtml(input: string): string {
  const escaped = input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
  return escaped.replaceAll('\n', '<br />');
}

function getScrollContainers(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-lk-scroll-container]'));
}

function readInputValue(input: HTMLElement): unknown {
  if (input instanceof HTMLInputElement) {
    if (input.type === 'checkbox') {
      return input.checked;
    }
    if (input.type === 'number' || input.type === 'range') {
      return Number(input.value);
    }
    return input.value;
  }
  if (input instanceof HTMLTextAreaElement || input instanceof HTMLSelectElement) {
    return input.value;
  }
  return undefined;
}

function writeInputValue(input: HTMLElement, value: unknown): void {
  if (input instanceof HTMLInputElement) {
    if (input.type === 'checkbox') {
      input.checked = Boolean(value);
      return;
    }
    input.value = String(value ?? '');
    return;
  }
  if (input instanceof HTMLTextAreaElement || input instanceof HTMLSelectElement) {
    input.value = String(value ?? '');
  }
}

export function saveHotReloadSnapshot(): void {
  const snapshot: HotReloadSnapshot = {
    inputs: {},
    tabs: {},
    scrollY: window.scrollY,
    containerScroll: {},
  };

  for (const field of Array.from(document.querySelectorAll<HTMLElement>('[data-lk-id] input, [data-lk-id] textarea, [data-lk-id] select'))) {
    const holder = field.closest<HTMLElement>('[data-lk-id]');
    if (!holder?.dataset.lkId) {
      continue;
    }
    snapshot.inputs[holder.dataset.lkId] = readInputValue(field);
  }

  for (const tabsRoot of Array.from(document.querySelectorAll<HTMLElement>('.lk-tabs[data-lk-id]'))) {
    const active = tabsRoot.querySelector<HTMLElement>('.lk-tab.is-active[data-lk-tab-target]');
    const tabsId = tabsRoot.dataset.lkId;
    const label = active?.dataset.lkTabTarget;
    if (tabsId && label) {
      snapshot.tabs[tabsId] = label;
    }
  }

  for (const container of getScrollContainers()) {
    const id = container.dataset.lkScrollContainer;
    if (id) {
      snapshot.containerScroll[id] = container.scrollTop;
    }
  }

  window.sessionStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
}

export function restoreHotReloadSnapshot(): void {
  const raw = window.sessionStorage.getItem(SNAPSHOT_KEY);
  if (!raw) {
    return;
  }

  let parsed: HotReloadSnapshot | null = null;
  try {
    parsed = JSON.parse(raw) as HotReloadSnapshot;
  } catch {
    window.sessionStorage.removeItem(SNAPSHOT_KEY);
    return;
  }

  if (!parsed) {
    window.sessionStorage.removeItem(SNAPSHOT_KEY);
    return;
  }

  for (const [componentId, value] of Object.entries(parsed.inputs)) {
    const holder = document.querySelector<HTMLElement>(`[data-lk-id="${componentId}"]`);
    if (!holder) {
      continue;
    }
    const input = holder.querySelector<HTMLElement>('input, textarea, select');
    if (input) {
      writeInputValue(input, value);
    }
  }

  for (const [tabsId, label] of Object.entries(parsed.tabs)) {
    const tabsRoot = document.querySelector<HTMLElement>(`.lk-tabs[data-lk-id="${tabsId}"]`);
    if (!tabsRoot) {
      continue;
    }
    for (const btn of Array.from(tabsRoot.querySelectorAll<HTMLButtonElement>('.lk-tab[data-lk-tab-target]'))) {
      const isActive = btn.dataset.lkTabTarget === label;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
      btn.tabIndex = isActive ? 0 : -1;
    }
    for (const panel of Array.from(tabsRoot.querySelectorAll<HTMLElement>('.lk-tab-panel[data-lk-tab-panel]'))) {
      const isActive = panel.dataset.lkTabPanel === label;
      if (isActive) {
        panel.removeAttribute('hidden');
      } else {
        panel.setAttribute('hidden', '');
      }
    }
  }

  window.scrollTo({ top: parsed.scrollY, left: 0 });
  for (const container of getScrollContainers()) {
    const id = container.dataset.lkScrollContainer;
    if (!id) {
      continue;
    }
    const top = parsed.containerScroll[id];
    if (typeof top === 'number') {
      container.scrollTop = top;
    }
  }

  window.sessionStorage.removeItem(SNAPSHOT_KEY);
}

export function ensureReconnectBanner(): HTMLElement {
  let banner = document.getElementById('lk-reconnect-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'lk-reconnect-banner';
    banner.className = 'lk-reconnect-banner';
    banner.textContent = 'Reconnecting...';
    document.body.appendChild(banner);
  }
  return banner;
}

export function hideReconnectBanner(): void {
  const banner = document.getElementById('lk-reconnect-banner');
  if (banner) {
    banner.remove();
  }
}

export function applyErrorOverlay(message: string, stack?: string): void {
  const existing = document.getElementById('lk-error-overlay');
  if (existing) {
    existing.remove();
  }
  const overlay = document.createElement('div');
  overlay.id = 'lk-error-overlay';
  overlay.className = 'lk-error-overlay';
  const stackHtml = stack ? `<pre class="lk-error-stack">${escapeHtml(stack)}</pre>` : '';
  overlay.innerHTML = `<div class="lk-error-card"><h2>Render error</h2><p>${escapeHtml(message)}</p>${stackHtml}</div>`;
  document.body.appendChild(overlay);
}

export function clearErrorOverlay(): void {
  const overlay = document.getElementById('lk-error-overlay');
  if (overlay) {
    overlay.remove();
  }
}

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

function applyBatchedInner(entry: BatchedInnerMessage): void {
  if (entry.type === 'FRAGMENT') {
    applyFragmentSwap(entry.payload.id, entry.payload.html);
    return;
  }
  applyStreamChunk(entry.payload.id, entry.payload.chunk, entry.payload.done, entry.payload.format);
}

export function applyBatch(payload: BatchMessage['payload']): void {
  for (const entry of payload.messages) {
    applyBatchedInner(entry);
  }
}
