import type { AnyComponentHandle } from '../components/types';

export function escapeHtml(input: string): string {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll('\'', '&#39;');
}

function renderAttributes(attrs: Record<string, string | undefined | boolean>): string {
  const pairs: string[] = [];
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === false) {
      continue;
    }
    if (value === true) {
      pairs.push(key);
      continue;
    }
    pairs.push(`${key}="${escapeHtml(value)}"`);
  }
  return pairs.length > 0 ? ` ${pairs.join(' ')}` : '';
}

export function renderComponent(handle: AnyComponentHandle): string {
  if (handle.type === 'text') {
    const content = escapeHtml(String(handle.props.content));
    return `<p class="lk-text" data-lk-id="${handle.id}">${content}</p>`;
  }

  if (handle.type === 'button') {
    const label = escapeHtml(String(handle.props.label));
    const attrs = renderAttributes({
      'class': 'lk-button',
      'data-lk-id': handle.id,
      'data-lk-kind': 'button',
      'data-lk-event': 'click',
      'disabled': handle.props.loading ? true : undefined,
      'aria-busy': handle.props.loading ? 'true' : undefined,
    });
    const loading = handle.props.loading
      ? '<span class="lk-spinner" aria-hidden="true"></span>'
      : '';
    return `<button${attrs}>${loading}<span>${label}</span></button>`;
  }

  const exhaustiveCheck: never = handle;
  throw new Error(`No renderer for component type: ${String(exhaustiveCheck)}`);
}

export function renderPage(components: AnyComponentHandle[]): string {
  return components.map((component) => renderComponent(component)).join('\n');
}
