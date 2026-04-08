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
  if (target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement) {
    return target.value;
  }
  return undefined;
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

export function bindEventDelegation(root: Document, channel: EventChannel): void {
  root.addEventListener('click', (event) => {
    if (!(event.target instanceof Element))
      return;
    const tabBtn = event.target.closest<HTMLButtonElement>('.lk-tab[data-lk-tab-target]');
    if (tabBtn && !tabBtn.disabled) {
      const tabsRoot = tabBtn.closest('.lk-tabs');
      const target = tabBtn.dataset.lkTabTarget;
      if (tabsRoot && target) {
        for (const b of Array.from(tabsRoot.querySelectorAll<HTMLButtonElement>('.lk-tab[data-lk-tab-target]'))) {
          b.classList.toggle('is-active', b.dataset.lkTabTarget === target);
        }
        for (const panel of Array.from(tabsRoot.querySelectorAll<HTMLElement>('.lk-tab-panel'))) {
          const match = panel.dataset.lkTabPanel === target;
          if (match) {
            panel.removeAttribute('hidden');
          }
          else {
            panel.setAttribute('hidden', '');
          }
        }
        const id = resolveComponentId(tabsRoot);
        if (id) {
          channel.send({
            type: 'EVENT',
            payload: { id, event: 'change', value: target },
          });
        }
      }
    }
  });

  root.addEventListener('click', (event) => {
    if (!(event.target instanceof Element))
      return;
    const clickable = closestWithEventToken(event.target, 'click');
    if (!clickable)
      return;
    const id = resolveComponentId(clickable);
    if (!id)
      return;
    channel.send({ type: 'EVENT', payload: { id, event: 'click' } });
  });

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
    channel.send({ type: 'EVENT', payload: { id, event: 'click', value: rowId } });
  });

  root.addEventListener('change', (event) => {
    if (!(event.target instanceof Element))
      return;
    const changeable = closestWithEventToken(event.target, 'change');
    if (!changeable)
      return;
    const id = resolveComponentId(changeable);
    if (!id)
      return;
    channel.send({
      type: 'EVENT',
      payload: { id, event: 'change', value: coerceValue(event.target) },
    });
  });

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
    channel.send({
      type: 'EVENT',
      payload: { id, event: 'change', value: coerceValue(event.target) },
    });
  });

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
    channel.send({
      type: 'EVENT',
      payload: { id, event: 'change', value: next },
    });
  }, true);

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
      channel.send({ type: 'EVENT', payload: { id, event: 'change', value: null } });
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
      if (!response.ok) {
        return;
      }
      const payload = await response.json() as unknown;
      const uploaded = Array.isArray(payload)
        ? payload
        : payload;
      channel.send({
        type: 'EVENT',
        payload: {
          id,
          event: 'change',
          value: uploaded ?? null,
        },
      });
    } catch {
      // best effort
    }
  });
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
