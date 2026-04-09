import type { ClientToServerMessage } from '../engine/messages';

export interface EventChannel {
  send: (message: ClientToServerMessage) => void;
}

const EVENT_ATTR = 'data-lk-event';

function isDebugWs(): boolean {
  return typeof window !== 'undefined'
    && Boolean((window as Window & { __LK_DEBUG_WS__?: boolean }).__LK_DEBUG_WS__);
}

function coerceValue(target: EventTarget | null): unknown {
  if (!(target instanceof HTMLElement))
    return undefined;
  if (target instanceof HTMLInputElement) {
    if (target.type === 'checkbox')
      return target.checked;
    if (target.type === 'number' || target.type === 'range')
      return Number(target.value);
    return target.value;
  }
  if (target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement)
    return target.value;
  return undefined;
}

function coerceMultiSelectValue(root: HTMLElement): string[] {
  const values: string[] = [];
  for (const box of Array.from(root.querySelectorAll<HTMLInputElement>('input[type="checkbox"][data-lk-multi-option]'))) {
    if (box.checked) {
      values.push(box.value);
    }
  }
  return values;
}

function resolveComponentId(target: EventTarget | null): string | null {
  if (!(target instanceof Element))
    return null;
  const holder = target.closest<HTMLElement>('[data-lk-id]');
  return holder?.dataset.lkId ?? null;
}

function hasEventToken(element: Element, token: string): boolean {
  const raw = element.getAttribute(EVENT_ATTR);
  if (!raw)
    return false;
  return raw.split(/\s+/).includes(token);
}

function closestWithEventToken(target: EventTarget | null, token: string): Element | null {
  if (!(target instanceof Element))
    return null;
  let node: Element | null = target;
  while (node) {
    if (hasEventToken(node, token))
      return node;
    node = node.parentElement;
  }
  return null;
}

function hasAnyEventToken(element: Element, tokens: string[]): boolean {
  return tokens.some((token) => hasEventToken(element, token));
}

function sendEvent(channel: EventChannel, id: string, event: 'click' | 'change' | 'blur' | 'focus', value?: unknown): void {
  channel.send({
    type: 'EVENT',
    payload: { id, event, value },
  });
}

function bindWidgetClicks(root: Document, channel: EventChannel): void {
  root.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }

    const swatch = closestWithEventToken(event.target, 'pick-swatch');
    if (swatch) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const holder = swatch.closest<HTMLElement>('[data-lk-id][data-lk-kind="colorPicker"]');
      const id = holder?.dataset.lkId;
      const picked = swatch.getAttribute('data-lk-swatch') ?? '';
      if (!holder || !id || !picked) {
        return;
      }
      const colorInput = holder.querySelector<HTMLInputElement>('input[type="color"]');
      if (colorInput) {
        colorInput.value = picked;
      }
      const code = holder.querySelector<HTMLElement>('.lk-color-value');
      if (code) {
        code.textContent = picked;
      }
      sendEvent(channel, id, 'change', picked);
      return;
    }

    const filmItem = closestWithEventToken(event.target, 'filmstrip-select');
    if (!filmItem) {
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    const strip = filmItem.closest<HTMLElement>('.lk-film-strip[data-lk-id]');
    const id = strip?.dataset.lkId;
    if (!strip || !id) {
      return;
    }
    const index = Number((filmItem as HTMLElement).dataset.lkIndex ?? '-1');
    const buttons = Array.from(strip.querySelectorAll<HTMLButtonElement>('.lk-film-item[data-lk-index]'));
    const preview = strip.querySelector<HTMLImageElement>('.lk-film-strip-viewer img');
    for (const [i, button] of buttons.entries()) {
      const active = i === index;
      button.classList.toggle('is-selected', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
      if (!active || !preview) {
        continue;
      }
      const src = button.dataset.lkSrc;
      const alt = button.dataset.lkAlt;
      if (src) {
        preview.src = src;
      }
      if (alt) {
        preview.alt = alt;
      }
    }
    if (index >= 0) {
      sendEvent(channel, id, 'change', index);
    }
  });
}

function bindTabs(root: Document, channel: EventChannel): void {
  root.addEventListener('click', (event) => {
    if (!(event.target instanceof Element))
      return;
    const tabBtn = event.target.closest<HTMLButtonElement>('.lk-tab[data-lk-tab-target]');
    if (!tabBtn || tabBtn.disabled)
      return;
    const tabsRoot = tabBtn.closest('.lk-tabs');
    const target = tabBtn.dataset.lkTabTarget;
    if (!tabsRoot || !target)
      return;

    for (const b of Array.from(tabsRoot.querySelectorAll<HTMLButtonElement>('.lk-tab[data-lk-tab-target]'))) {
      const active = b.dataset.lkTabTarget === target;
      b.classList.toggle('is-active', active);
      b.setAttribute('aria-selected', active ? 'true' : 'false');
      b.tabIndex = active ? 0 : -1;
    }
    for (const panel of Array.from(tabsRoot.querySelectorAll<HTMLElement>('.lk-tab-panel'))) {
      const match = panel.dataset.lkTabPanel === target;
      if (match) {
        panel.removeAttribute('hidden');
      } else {
        panel.setAttribute('hidden', '');
      }
    }
    const id = resolveComponentId(tabsRoot);
    if (!id)
      return;
    sendEvent(channel, id, 'change', target);
  });
}

function bindTableClicks(root: Document, channel: EventChannel): void {
  root.addEventListener('click', (event) => {
    if (!(event.target instanceof Element))
      return;
    const tableRow = event.target.closest<HTMLElement>('[data-lk-table-row-id]');
    if (!tableRow)
      return;
    const table = tableRow.closest<HTMLElement>('[data-lk-id][data-lk-kind="table"]');
    const id = table?.dataset.lkId;
    const rowId = tableRow.dataset.lkTableRowId;
    if (!id || !rowId)
      return;
    sendEvent(channel, id, 'click', rowId);
  });
}

function bindGenericClicks(root: Document, channel: EventChannel): void {
  root.addEventListener('click', (event) => {
    if (!(event.target instanceof Element))
      return;
    const clickable = closestWithEventToken(event.target, 'click');
    if (!clickable)
      return;
    if (hasAnyEventToken(clickable, ['pick-swatch', 'filmstrip-select']))
      return;
    const id = resolveComponentId(clickable);
    if (!id)
      return;
    sendEvent(channel, id, 'click');
  });
}

function bindChanges(root: Document, channel: EventChannel): void {
  root.addEventListener('change', (event) => {
    if (!(event.target instanceof Element))
      return;
    const changeable = closestWithEventToken(event.target, 'change');
    if (!changeable)
      return;
    const id = resolveComponentId(changeable);
    if (!id)
      return;

    const holder = changeable.closest<HTMLElement>('[data-lk-kind="multiSelect"]');
    if (holder) {
      sendEvent(channel, id, 'change', coerceMultiSelectValue(holder));
      return;
    }

    sendEvent(channel, id, 'change', coerceValue(event.target));
  });
}

function bindLiveInput(root: Document, channel: EventChannel): void {
  root.addEventListener('input', (event) => {
    if (!(event.target instanceof Element))
      return;
    const liveInput = closestWithEventToken(event.target, 'input');
    if (!liveInput)
      return;
    if (event.target instanceof HTMLInputElement && event.target.type === 'number')
      return;
    const id = resolveComponentId(liveInput);
    if (!id)
      return;
    sendEvent(channel, id, 'change', coerceValue(event.target));
  });
}

function bindNumberClamp(root: Document, channel: EventChannel): void {
  root.addEventListener('blur', (event) => {
    if (!(event.target instanceof HTMLInputElement))
      return;
    const clamped = closestWithEventToken(event.target, 'blur-clamp');
    if (!clamped || event.target.type !== 'number')
      return;
    const minAttr = event.target.getAttribute('min');
    const maxAttr = event.target.getAttribute('max');
    const min = minAttr == null || minAttr === '' ? null : Number(minAttr);
    const max = maxAttr == null || maxAttr === '' ? null : Number(maxAttr);
    if (Number.isNaN(event.target.valueAsNumber))
      return;
    let next = event.target.valueAsNumber;
    if (min !== null && Number.isFinite(min))
      next = Math.max(min, next);
    if (max !== null && Number.isFinite(max))
      next = Math.min(max, next);
    if (next !== event.target.valueAsNumber)
      event.target.value = String(next);
    const id = resolveComponentId(clamped);
    if (!id)
      return;
    sendEvent(channel, id, 'change', next);
  }, true);
}

function bindCopyCode(root: Document): void {
  root.addEventListener('click', async (event) => {
    if (!(event.target instanceof Element))
      return;
    const copyButton = closestWithEventToken(event.target, 'copy-code');
    if (!copyButton)
      return;
    const container = copyButton.closest<HTMLElement>('[data-lk-id]');
    const source = container?.querySelector<HTMLElement>('.lk-code-source');
    if (!source)
      return;
    try {
      await navigator.clipboard.writeText(source.textContent ?? '');
      const button = copyButton as HTMLElement;
      button.classList.add('is-copied');
      button.textContent = 'Copied';
      window.setTimeout(() => {
        button.classList.remove('is-copied');
        button.textContent = 'Copy';
      }, 1000);
    } catch {
      // ignore clipboard errors in unsupported contexts
    }
  });
}

function bindFileUpload(root: Document, channel: EventChannel): void {
  root.addEventListener('change', async (event) => {
    if (!(event.target instanceof HTMLInputElement))
      return;
    if (event.target.type !== 'file')
      return;

    const holder = event.target.closest<HTMLElement>('[data-lk-id][data-lk-kind="fileUpload"]');
    const id = holder?.dataset.lkId;
    if (!id)
      return;

    const files = event.target.files ? Array.from(event.target.files) : [];
    if (files.length === 0) {
      sendEvent(channel, id, 'change', null);
      return;
    }

    const formData = new FormData();
    for (const file of files) {
      formData.append('file', file, file.name);
    }

    try {
      const connectionId = String(window.localStorage.getItem('lk-connection-id') ?? '');
      const maxSize = holder.dataset.lkMaxSize;
      const search = connectionId ? `?connectionId=${encodeURIComponent(connectionId)}` : '';
      const uploadUrl = `/upload${search}`;
      if (isDebugWs()) {
        console.debug('[lastriko] fetch →', uploadUrl, 'POST', '(multipart)');
      }
      const headers = new Headers();
      if (maxSize) {
        headers.set('x-lastriko-upload-max-size', maxSize);
      }
      const response = await fetch(uploadUrl, { method: 'POST', body: formData, headers });
      if (isDebugWs()) {
        console.debug('[lastriko] fetch ←', uploadUrl, response.status, response.statusText);
      }
      if (!response.ok)
        return;

      const payload = await response.json() as unknown;
      sendEvent(channel, id, 'change', payload ?? null);
    } catch {
      // best effort
    }
  });
}

export function bindEventDelegation(root: Document, channel: EventChannel): void {
  bindWidgetClicks(root, channel);
  bindTabs(root, channel);
  bindGenericClicks(root, channel);
  bindTableClicks(root, channel);
  bindChanges(root, channel);
  bindLiveInput(root, channel);
  bindNumberClamp(root, channel);
  bindCopyCode(root);
  bindFileUpload(root, channel);
}

export function bindThemeToggle(root: Document, channel: EventChannel): void {
  const toggle = root.getElementById('lk-theme-toggle');
  if (!toggle)
    return;
  toggle.addEventListener('click', () => {
    const current = root.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const mode = current === 'dark' ? 'light' : 'dark';
    channel.send({ type: 'THEME_CHANGE', payload: { mode } });
  });
}
