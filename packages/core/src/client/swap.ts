import type { BatchMessage, BatchedInnerMessage, RenderMessage } from '../engine/messages';

const SNAPSHOT_KEY = 'lk-hot-reload-snapshot';

export interface HotReloadSnapshot {
  inputs: Record<string, unknown>;
  tabs: Record<string, string>;
  scrollY: number;
  containerScroll: Record<string, number>;
}

interface VirtualTableRow {
  id: string;
  data: Record<string, unknown>;
}

interface VirtualTableData {
  rows: VirtualTableRow[];
  columns: string[];
  rowHeight: number;
}

const VIRTUAL_OVERSCAN_ROWS = 8;
const VIRTUAL_MIN_VISIBLE_ROWS = 8;
const virtualBoundTables = new WeakSet<HTMLElement>();
const virtualVisibleTables = new WeakSet<HTMLElement>();
const virtualPendingFrames = new WeakMap<HTMLElement, number>();
const virtualTables = new Set<HTMLElement>();
let virtualObserver: IntersectionObserver | null = null;
let virtualResizeBound = false;

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

function readComponentValue(holder: HTMLElement): unknown {
  if (holder.dataset.lkKind === 'multiSelect') {
    const selected: string[] = [];
    for (const box of Array.from(holder.querySelectorAll<HTMLInputElement>('input[type="checkbox"][data-lk-multi-option]'))) {
      if (box.checked) {
        selected.push(box.value);
      }
    }
    return selected;
  }
  const input = holder.querySelector<HTMLElement>('input, textarea, select');
  return input ? readInputValue(input) : undefined;
}

function writeComponentValue(holder: HTMLElement, value: unknown): void {
  if (holder.dataset.lkKind === 'multiSelect') {
    const selected = new Set(Array.isArray(value) ? value.map((item) => String(item)) : []);
    for (const box of Array.from(holder.querySelectorAll<HTMLInputElement>('input[type="checkbox"][data-lk-multi-option]'))) {
      box.checked = selected.has(box.value);
    }
    return;
  }
  const input = holder.querySelector<HTMLElement>('input, textarea, select');
  if (input) {
    writeInputValue(input, value);
  }
}

function parseVirtualTableData(container: HTMLElement): VirtualTableData | null {
  if (container.dataset.lkVirtualized !== 'true') {
    return null;
  }
  const rawRows = container.dataset.lkTableRows;
  const rawColumns = container.dataset.lkTableColumns;
  if (!rawRows || !rawColumns) {
    return null;
  }
  let rows: VirtualTableRow[] = [];
  let columns: string[] = [];
  try {
    rows = JSON.parse(rawRows) as VirtualTableRow[];
    columns = JSON.parse(rawColumns) as string[];
  } catch {
    return null;
  }
  const rowHeight = Number(container.dataset.lkTableRowHeight ?? '36');
  const safeRowHeight = Number.isFinite(rowHeight) && rowHeight > 0 ? rowHeight : 36;
  return { rows, columns, rowHeight: safeRowHeight };
}

function buildVirtualRowsHtml(
  rows: VirtualTableRow[],
  columns: string[],
  rowHeight: number,
  startIndex: number,
  endIndex: number,
): string {
  const clampedStart = Math.max(0, startIndex);
  const clampedEnd = Math.min(rows.length, Math.max(clampedStart, endIndex));
  const topPadding = clampedStart * rowHeight;
  const bottomPadding = Math.max(0, (rows.length - clampedEnd) * rowHeight);
  const output: string[] = [];

  if (topPadding > 0) {
    output.push(`<tr class="lk-table-virtual-spacer" aria-hidden="true"><td colspan="${Math.max(1, columns.length)}" style="height:${topPadding}px;padding:0;border:0;"></td></tr>`);
  }

  for (let i = clampedStart; i < clampedEnd; i += 1) {
    const row = rows[i];
    if (!row) {
      continue;
    }
    const cells = columns
      .map((column) => `<td>${escapeHtml(String(row.data[column] ?? ''))}</td>`)
      .join('');
    output.push(`<tr data-lk-table-row-id="${row.id}">${cells}</tr>`);
  }

  if (bottomPadding > 0) {
    output.push(`<tr class="lk-table-virtual-spacer" aria-hidden="true"><td colspan="${Math.max(1, columns.length)}" style="height:${bottomPadding}px;padding:0;border:0;"></td></tr>`);
  }

  return output.join('');
}

function renderVirtualTableBody(container: HTMLElement): void {
  const data = parseVirtualTableData(container);
  if (!data) {
    return;
  }
  const tbody = container.querySelector<HTMLTableSectionElement>('tbody');
  if (!tbody) {
    return;
  }
  const viewportHeight = Math.max(1, container.clientHeight || 420);
  const visibleRows = Math.max(VIRTUAL_MIN_VISIBLE_ROWS, Math.ceil(viewportHeight / data.rowHeight));
  const scrollTop = Math.max(0, container.scrollTop);
  const start = Math.max(0, Math.floor(scrollTop / data.rowHeight) - VIRTUAL_OVERSCAN_ROWS);
  const end = Math.min(data.rows.length, start + visibleRows + VIRTUAL_OVERSCAN_ROWS * 2);
  tbody.innerHTML = buildVirtualRowsHtml(data.rows, data.columns, data.rowHeight, start, end);
}

function scheduleVirtualRefresh(container: HTMLElement): void {
  const pending = virtualPendingFrames.get(container);
  if (pending !== undefined) {
    cancelAnimationFrame(pending);
  }
  const frame = window.requestAnimationFrame(() => {
    virtualPendingFrames.delete(container);
    renderVirtualTableBody(container);
  });
  virtualPendingFrames.set(container, frame);
}

function refreshVisibleVirtualTables(): void {
  for (const container of Array.from(virtualTables)) {
    if (!virtualVisibleTables.has(container)) {
      continue;
    }
    scheduleVirtualRefresh(container);
  }
}

export function observeVirtualTables(root: ParentNode = document): void {
  const candidates = Array.from(root.querySelectorAll<HTMLElement>('.lk-table-wrap[data-lk-virtualized="true"]'));
  if (candidates.length === 0) {
    return;
  }

  if (!virtualObserver) {
    virtualObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const target = entry.target as HTMLElement;
        if (entry.isIntersecting) {
          virtualVisibleTables.add(target);
          scheduleVirtualRefresh(target);
        } else {
          virtualVisibleTables.delete(target);
        }
      }
    }, { threshold: 0 });
  }

  if (!virtualResizeBound) {
    virtualResizeBound = true;
    window.addEventListener('resize', refreshVisibleVirtualTables);
  }

  for (const container of candidates) {
    if (virtualBoundTables.has(container)) {
      continue;
    }
    virtualBoundTables.add(container);
    virtualTables.add(container);
    container.addEventListener('scroll', () => {
      if (virtualVisibleTables.has(container)) {
        scheduleVirtualRefresh(container);
      }
    });
    virtualObserver.observe(container);
    scheduleVirtualRefresh(container);
  }
}

export function saveHotReloadSnapshot(): void {
  const snapshot: HotReloadSnapshot = {
    inputs: {},
    tabs: {},
    scrollY: window.scrollY,
    containerScroll: {},
  };

  for (const holder of Array.from(document.querySelectorAll<HTMLElement>('[data-lk-id]'))) {
    const id = holder.dataset.lkId;
    if (!id) {
      continue;
    }
    const value = readComponentValue(holder);
    if (value !== undefined) {
      snapshot.inputs[id] = value;
    }
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
    writeComponentValue(holder, value);
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
  observeVirtualTables(document);
}

export function applyFragmentSwap(id: string, html: string): void {
  const target = document.querySelector<HTMLElement>(`[data-lk-id="${id}"]`);
  if (!target) {
    return;
  }
  target.outerHTML = html;
  observeVirtualTables(document);
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

export function __resetVirtualTableStateForTests(): void {
  if (virtualObserver) {
    virtualObserver.disconnect();
    virtualObserver = null;
  }
  for (const container of Array.from(virtualTables)) {
    const pending = virtualPendingFrames.get(container);
    if (pending !== undefined) {
      cancelAnimationFrame(pending);
      virtualPendingFrames.delete(container);
    }
  }
  virtualTables.clear();
  virtualResizeBound = false;
}
