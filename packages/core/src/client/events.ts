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
