import type { ClientToServerMessage } from '../engine/messages';

export interface EventChannel {
  send: (message: ClientToServerMessage) => void;
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

export function bindEventDelegation(root: Document, channel: EventChannel): void {
  root.addEventListener('click', (event) => {
    if (!(event.target instanceof Element))
      return;
    const clickable = event.target.closest('[data-lk-event="click"]');
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
    const changeable = event.target.closest('[data-lk-event="change"]');
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
      const search = connectionId ? `?connectionId=${encodeURIComponent(connectionId)}` : '';
      const response = await fetch(`/upload${search}`, { method: 'POST', body: formData });
      if (!response.ok) {
        return;
      }
      const payload = await response.json() as unknown;
      const uploaded = Array.isArray(payload)
        ? payload
        : (payload as { file?: unknown }).file;
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
