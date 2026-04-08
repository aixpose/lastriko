import type {
  AnyComponentHandle,
  ButtonHandle,
  ChatHandle,
  ComponentHandle,
  FileUploadHandle,
  MetricHandle,
  ProgressHandle,
  PromptEditorHandle,
  SelectHandle,
  StreamHandle,
  TableHandle,
  TextHandle,
  TextInputHandle,
  ToggleHandle,
  NumberInputHandle,
  SliderHandle,
} from '../components/types';
import { renderMarkdownToSafeHtml } from './markdown';

export function escapeHtml(input: string): string {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll('\'', '&#39;');
}

function renderAttributes(attrs: Record<string, string | number | undefined | boolean>): string {
  const pairs: string[] = [];
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === false) {
      continue;
    }
    if (value === true) {
      pairs.push(key);
      continue;
    }
    pairs.push(`${key}="${escapeHtml(String(value))}"`);
  }
  return pairs.length > 0 ? ` ${pairs.join(' ')}` : '';
}

function renderInputLabel(label: string, helperText: string): string {
  const helper = helperText ? `<div class="lk-helper">${escapeHtml(helperText)}</div>` : '';
  return `<label class="lk-label">${escapeHtml(label)}</label>${helper}`;
}

function renderText(handle: TextHandle): string {
  return `<p class="lk-text" data-lk-id="${handle.id}">${escapeHtml(String(handle.props.content))}</p>`;
}

function renderButton(handle: ButtonHandle): string {
  const attrs = renderAttributes({
    'class': `lk-button lk-button--${handle.props.variant ?? 'primary'}`,
    'data-lk-id': handle.id,
    'data-lk-kind': 'button',
    'data-lk-event': 'click',
    'disabled': handle.props.loading || handle.props.disabled,
    'aria-busy': handle.props.loading ? 'true' : undefined,
    'type': 'button',
  });
  const spinner = handle.props.loading ? '<span class="lk-spinner" aria-hidden="true"></span>' : '';
  return `<button${attrs}>${spinner}<span>${escapeHtml(handle.props.label)}</span></button>`;
}

function renderTextInput(handle: TextInputHandle | PromptEditorHandle): string {
  const commonAttrs = renderAttributes({
    'data-lk-id': handle.id,
    'data-lk-kind': handle.type,
    'data-lk-event': 'change',
    'disabled': handle.props.disabled,
    'maxlength': handle.props.maxLength,
    'placeholder': handle.props.placeholder,
    'aria-label': handle.props.label,
  });
  const value = escapeHtml(handle.props.value);
  const input = handle.props.multiline
    ? `<textarea${commonAttrs} rows="${handle.props.rows ?? 3}">${value}</textarea>`
    : `<input${commonAttrs} type="${handle.props.type ?? 'text'}" value="${value}" />`;
  const promptProps = handle.props as Partial<PromptEditorHandle['props']>;
  const extra = handle.type === 'promptEditor' && promptProps.showCharCount
    ? `<div class="lk-meta">${String(handle.props.value.length)} chars</div>`
    : '';
  const label = String(handle.props.label ?? '');
  const helperText = String(handle.props.helperText ?? '');
  return `<div class="lk-field" data-lk-id="${handle.id}">${renderInputLabel(label, helperText)}${input}${extra}</div>`;
}

function renderNumberInput(handle: NumberInputHandle): string {
  const attrs = renderAttributes({
    'type': 'number',
    'value': handle.props.value,
    'min': handle.props.min,
    'max': handle.props.max,
    'step': handle.props.step ?? 1,
    'disabled': handle.props.disabled,
    'data-lk-event': 'change',
    'aria-label': handle.props.label,
  });
  const label = String(handle.props.label ?? '');
  const helperText = String(handle.props.helperText ?? '');
  return `<div class="lk-field" data-lk-id="${handle.id}">${renderInputLabel(label, helperText)}<input${attrs} /></div>`;
}

function renderSlider(handle: SliderHandle): string {
  const attrs = renderAttributes({
    'type': 'range',
    'min': handle.props.min,
    'max': handle.props.max,
    'step': handle.props.step ?? 1,
    'value': handle.props.value,
    'disabled': handle.props.disabled,
    'data-lk-event': 'change',
    'aria-label': handle.props.label,
  });
  const value = handle.props.showValue === false ? '' : `<span class="lk-slider-value">${escapeHtml(String(handle.props.value))}</span>`;
  const label = String(handle.props.label ?? '');
  const helperText = String(handle.props.helperText ?? '');
  return `<div class="lk-field" data-lk-id="${handle.id}">${renderInputLabel(label, helperText)}<div class="lk-slider-row"><input${attrs} />${value}</div></div>`;
}

function renderToggle(handle: ToggleHandle): string {
  const attrs = renderAttributes({
    'type': 'checkbox',
    'checked': handle.props.value,
    'disabled': handle.props.disabled,
    'data-lk-event': 'change',
    'aria-label': handle.props.label,
  });
  const stateLabel = handle.props.value
    ? (handle.props.onLabel ?? 'On')
    : (handle.props.offLabel ?? 'Off');
  const label = String(handle.props.label ?? '');
  const helperText = String(handle.props.helperText ?? '');
  return `<div class="lk-field lk-field--toggle" data-lk-id="${handle.id}">${renderInputLabel(label, helperText)}<label class="lk-toggle-wrap"><input${attrs} /><span class="lk-toggle"></span><span class="lk-toggle-state">${escapeHtml(stateLabel)}</span></label></div>`;
}

function renderSelect(handle: SelectHandle): string {
  const options = handle.props.options.map((option) => {
    const attrs = renderAttributes({
      value: option.value,
      selected: option.value === handle.props.value,
      disabled: option.disabled,
    });
    return `<option${attrs}>${escapeHtml(option.label)}</option>`;
  }).join('');
  const placeholder = handle.props.placeholder && !handle.props.value
    ? `<option value="" selected disabled>${escapeHtml(handle.props.placeholder)}</option>`
    : '';
  const attrs = renderAttributes({
    'disabled': handle.props.disabled,
    'data-lk-event': 'change',
    'aria-label': handle.props.label,
  });
  const label = String(handle.props.label ?? '');
  const helperText = String(handle.props.helperText ?? '');
  return `<div class="lk-field" data-lk-id="${handle.id}">${renderInputLabel(label, helperText)}<select${attrs}>${placeholder}${options}</select></div>`;
}

function renderFileUpload(handle: FileUploadHandle): string {
  const attrs = renderAttributes({
    'type': 'file',
    'accept': handle.props.accept,
    'multiple': handle.props.multiple,
    'disabled': handle.props.disabled,
    'data-lk-event': 'change',
    'aria-label': handle.props.label,
  });
  const valueLabel = (() => {
    if (!handle.props.value) {
      return 'No file selected';
    }
    if (Array.isArray(handle.props.value)) {
      return `${handle.props.value.length} files`;
    }
    return handle.props.value.name;
  })();
  const label = String(handle.props.label ?? '');
  const helperText = String(handle.props.helperText ?? '');
  return `<div class="lk-field lk-file-upload" data-lk-id="${handle.id}" data-lk-kind="fileUpload">${renderInputLabel(label, helperText)}<input${attrs} /><div class="lk-file-upload-value">${escapeHtml(valueLabel)}</div></div>`;
}

function renderMarkdown(handle: ComponentHandle<{ content: string }>): string {
  const html = renderMarkdownToSafeHtml(handle.props.content);
  return `<div class="lk-markdown" data-lk-id="${handle.id}">${html}</div>`;
}

function renderImage(handle: ComponentHandle<{ src: string | null | undefined; alt: string; caption?: string; width?: string | number; height?: string | number }>): string {
  if (!handle.props.src) {
    return `<figure class="lk-image lk-image--empty" data-lk-id="${handle.id}"><div class="lk-image-placeholder">${escapeHtml(handle.props.alt)}</div></figure>`;
  }
  const attrs = renderAttributes({
    src: handle.props.src,
    alt: handle.props.alt,
    loading: 'lazy',
    width: handle.props.width,
    height: handle.props.height,
  });
  const caption = handle.props.caption ? `<figcaption>${escapeHtml(handle.props.caption)}</figcaption>` : '';
  return `<figure class="lk-image" data-lk-id="${handle.id}"><img${attrs} />${caption}</figure>`;
}

function renderImageGrid(handle: ComponentHandle<{ items: Array<{ src: string; alt: string; caption?: string }>; cols?: number | 'auto'; gap?: number; minWidth?: number }>): string {
  const minWidth = handle.props.minWidth ?? 150;
  const gridTemplate = handle.props.cols === 'auto' || handle.props.cols === undefined
    ? `repeat(auto-fit, minmax(${minWidth}px, 1fr))`
    : `repeat(${handle.props.cols}, minmax(0, 1fr))`;
  const style = `style="display:grid;grid-template-columns:${gridTemplate};gap:${handle.props.gap ?? 8}px;"`;
  const items = handle.props.items.map((item) => `<figure><img loading="lazy" src="${escapeHtml(item.src)}" alt="${escapeHtml(item.alt)}" />${item.caption ? `<figcaption>${escapeHtml(item.caption)}</figcaption>` : ''}</figure>`).join('');
  return `<div class="lk-image-grid" data-lk-id="${handle.id}" ${style}>${items}</div>`;
}

function renderCode(handle: ComponentHandle<{ content: string; lang?: string }>): string {
  return `<pre class="lk-code" data-lk-id="${handle.id}" data-lk-lang="${escapeHtml(handle.props.lang ?? 'text')}"><code>${escapeHtml(handle.props.content)}</code></pre>`;
}

function renderJson(handle: ComponentHandle<{ label?: string; data: unknown }>): string {
  const label = handle.props.label ? `<div class="lk-json-label">${escapeHtml(handle.props.label)}</div>` : '';
  const json = escapeHtml(JSON.stringify(handle.props.data, null, 2) ?? 'null');
  return `<div class="lk-json" data-lk-id="${handle.id}">${label}<pre>${json}</pre></div>`;
}

function renderTable(handle: TableHandle): string {
  const head = handle.props.columns.map((column) => `<th>${escapeHtml(column)}</th>`).join('');
  const body = handle.props.rows.length > 0
    ? handle.props.rows.map((row) => {
        const cells = handle.props.columns.map((column) => `<td>${escapeHtml(String(row.data[column] ?? ''))}</td>`).join('');
        return `<tr data-lk-table-row-id="${row.id}">${cells}</tr>`;
      }).join('')
    : `<tr><td colspan="${Math.max(1, handle.props.columns.length)}">${escapeHtml(handle.props.emptyMessage ?? 'No data')}</td></tr>`;
  const style = handle.props.maxHeight ? `style="max-height:${handle.props.maxHeight}px;overflow:auto;display:block;"` : '';
  return `<div class="lk-table-wrap" data-lk-id="${handle.id}" data-lk-kind="table" ${style}><table class="lk-table${handle.props.striped ? ' lk-table--striped' : ''}"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

function renderMetric(handle: MetricHandle): string {
  const prefix = handle.props.prefix ? `<span class="lk-metric-prefix">${escapeHtml(handle.props.prefix)}</span>` : '';
  const unit = handle.props.unit ? `<span class="lk-metric-unit">${escapeHtml(handle.props.unit)}</span>` : '';
  const delta = handle.props.delta === undefined
    ? ''
    : `<div class="lk-metric-delta">${escapeHtml(String(handle.props.delta))}${handle.props.deltaLabel ? ` ${escapeHtml(handle.props.deltaLabel)}` : ''}</div>`;
  return `<div class="lk-metric" data-lk-id="${handle.id}"><div class="lk-metric-label">${escapeHtml(handle.props.label)}</div><div class="lk-metric-value">${prefix}${escapeHtml(handle.props.value)}${unit}</div>${delta}</div>`;
}

function renderProgress(handle: ProgressHandle): string {
  if (handle.props.value === null) {
    return `<div class="lk-progress lk-progress--indeterminate" data-lk-id="${handle.id}"><div class="lk-spinner" aria-hidden="true"></div><span>${escapeHtml(handle.props.label ?? 'Loading...')}</span></div>`;
  }
  const pct = Math.max(0, Math.min(100, Number(handle.props.value)));
  const text = handle.props.showPercentage === false ? '' : `<span class="lk-progress-pct">${pct}%</span>`;
  return `<div class="lk-progress" data-lk-id="${handle.id}">${handle.props.label ? `<div class="lk-progress-label">${escapeHtml(handle.props.label)}</div>` : ''}<div class="lk-progress-bar"><span style="width:${pct}%"></span></div>${text}</div>`;
}

function renderShell(handle: ComponentHandle<{ regions: Record<string, string[]>; opts: { sidebarPosition?: 'left' | 'right'; sidebarWidth?: string } }>, byId: Map<string, AnyComponentHandle>): string {
  const renderRegion = (ids: string[]) => ids.map((id) => byId.get(id)).filter(Boolean).map((child) => renderComponent(child as AnyComponentHandle, byId)).join('');
  const sidebarPosition = handle.props.opts.sidebarPosition ?? 'left';
  const sidebarWidth = handle.props.opts.sidebarWidth ?? '260px';
  return `<section class="lk-shell lk-shell--sidebar-${escapeHtml(sidebarPosition)}" data-lk-id="${handle.id}" style="--lk-sidebar-width:${escapeHtml(sidebarWidth)};">
    ${handle.props.regions.header.length ? `<header class="lk-shell-header">${renderRegion(handle.props.regions.header)}</header>` : ''}
    ${handle.props.regions.sidebar.length ? `<aside class="lk-shell-sidebar">${renderRegion(handle.props.regions.sidebar)}</aside>` : ''}
    <main class="lk-shell-main">${renderRegion(handle.props.regions.main)}</main>
    ${handle.props.regions.footer.length ? `<footer class="lk-shell-footer">${renderRegion(handle.props.regions.footer)}</footer>` : ''}
  </section>`;
}

function renderGrid(handle: ComponentHandle<{ cells: string[][]; opts: { cols?: number | string[]; rows?: number | string[]; gap?: number; minWidth?: number } }>, byId: Map<string, AnyComponentHandle>): string {
  const cols = handle.props.opts.cols;
  const minWidth = handle.props.opts.minWidth ?? 200;
  const templateCols = Array.isArray(cols)
    ? cols.join(' ')
    : typeof cols === 'number'
      ? `repeat(${cols}, minmax(0, 1fr))`
      : `repeat(auto-fit, minmax(${minWidth}px, 1fr))`;
  const gap = handle.props.opts.gap ?? 16;
  const cells = handle.props.cells.map((cell) => `<div class="lk-grid-cell">${cell.map((id) => byId.get(id)).filter(Boolean).map((child) => renderComponent(child as AnyComponentHandle, byId)).join('')}</div>`).join('');
  return `<div class="lk-grid" data-lk-id="${handle.id}" style="display:grid;grid-template-columns:${escapeHtml(templateCols)};gap:${gap}px;">${cells}</div>`;
}

function renderTabs(handle: ComponentHandle<Record<string, unknown>, string>, byId: Map<string, AnyComponentHandle>): string {
  const props = handle.props as {
    tabs: Array<{ label: string; disabled: boolean; ids: string[] }>;
    active: string;
  };
  const active = props.active;
  const nav = props.tabs.map((tab) => {
    const disabledAttr = tab.disabled ? ' disabled' : '';
    return `<button class="lk-tab${tab.label === active ? ' is-active' : ''}" type="button"${disabledAttr} data-lk-tab-target="${escapeHtml(tab.label)}">${escapeHtml(tab.label)}</button>`;
  }).join('');
  const bodies = props.tabs.map((tab) => {
    const hidden = tab.label === active ? '' : 'hidden';
    const content = tab.ids.map((id) => byId.get(id)).filter(Boolean).map((child) => renderComponent(child as AnyComponentHandle, byId)).join('');
    return `<section class="lk-tab-panel" data-lk-tab-panel="${escapeHtml(tab.label)}" ${hidden}>${content}</section>`;
  }).join('');
  return `<div class="lk-tabs" data-lk-id="${handle.id}"><nav class="lk-tab-nav">${nav}</nav>${bodies}</div>`;
}

function renderCard(handle: ComponentHandle<{ title?: string; ids: string[] }>, byId: Map<string, AnyComponentHandle>): string {
  const title = handle.props.title ? `<div class="lk-card-title">${escapeHtml(handle.props.title)}</div>` : '';
  const body = handle.props.ids.map((id) => byId.get(id)).filter(Boolean).map((child) => renderComponent(child as AnyComponentHandle, byId)).join('');
  return `<section class="lk-card" data-lk-id="${handle.id}">${title}${body}</section>`;
}

function renderDivider(handle: ComponentHandle<{ label?: string }>): string {
  return handle.props.label
    ? `<div class="lk-divider" data-lk-id="${handle.id}"><span>${escapeHtml(handle.props.label)}</span></div>`
    : `<hr class="lk-divider" data-lk-id="${handle.id}" />`;
}

function renderSpacer(handle: ComponentHandle<{ size: number | 'sm' | 'md' | 'lg' }>): string {
  const size = typeof handle.props.size === 'number'
    ? `${handle.props.size}px`
    : handle.props.size === 'sm'
      ? '8px'
      : handle.props.size === 'lg'
        ? '32px'
        : '16px';
  return `<div class="lk-spacer" data-lk-id="${handle.id}" style="height:${size}"></div>`;
}

function renderAlert(handle: ComponentHandle<{ message: string; type?: 'info' | 'success' | 'warning' | 'error'; title?: string }>): string {
  const title = handle.props.title ? `<div class="lk-alert-title">${escapeHtml(handle.props.title)}</div>` : '';
  return `<div role="alert" class="lk-alert lk-alert--${escapeHtml(handle.props.type ?? 'info')}" data-lk-id="${handle.id}">${title}<div>${escapeHtml(handle.props.message)}</div></div>`;
}

function renderLoading(handle: ComponentHandle<{ message: string; mode?: 'fullpage' | 'inline'; size?: 'sm' | 'md' | 'lg' }>): string {
  return `<div class="lk-loading lk-loading--${escapeHtml(handle.props.mode ?? 'inline')}" data-lk-id="${handle.id}"><span class="lk-spinner"></span><span>${escapeHtml(handle.props.message)}</span></div>`;
}

function renderStreamText(handle: StreamHandle): string {
  const text = handle.props.text ?? '';
  const body = (handle.props.format ?? 'markdown') === 'markdown'
    ? escapeHtml(text).replaceAll('\n', '<br />')
    : escapeHtml(text);
  const cursor = handle.props.cursor === false || !handle.props.isStreaming
    ? ''
    : '<span data-lk-stream-cursor class="lk-stream-cursor">▍</span>';
  return `<div class="lk-stream" data-lk-id="${handle.id}"><div class="lk-stream-body" data-lk-stream-body data-lk-text="${escapeHtml(text)}">${body}</div>${cursor}</div>`;
}

function renderChat(handle: ChatHandle): string {
  const messages = handle.props.messages.map((message) => `<div class="lk-chat-msg lk-chat-msg--${escapeHtml(message.role)}"><span class="lk-chat-role">${escapeHtml(message.role)}</span><p>${escapeHtml(message.content)}</p></div>`).join('');
  return `<section class="lk-chat" data-lk-id="${handle.id}"><div class="lk-chat-history">${messages}</div></section>`;
}

export function renderComponent(handle: AnyComponentHandle, byId?: Map<string, AnyComponentHandle>): string {
  switch (handle.type) {
    case 'text':
      return renderText(handle as TextHandle);
    case 'button':
      return renderButton(handle as ButtonHandle);
    case 'textInput':
      return renderTextInput(handle as TextInputHandle);
    case 'numberInput':
      return renderNumberInput(handle as NumberInputHandle);
    case 'slider':
      return renderSlider(handle as SliderHandle);
    case 'toggle':
      return renderToggle(handle as ToggleHandle);
    case 'select':
      return renderSelect(handle as SelectHandle);
    case 'fileUpload':
      return renderFileUpload(handle as FileUploadHandle);
    case 'promptEditor':
      return renderTextInput(handle as PromptEditorHandle);
    case 'markdown':
      return renderMarkdown(handle as ComponentHandle<{ content: string }>);
    case 'image':
      return renderImage(handle as ComponentHandle<{ src: string | null | undefined; alt: string; caption?: string; width?: string | number; height?: string | number }>);
    case 'imageGrid':
      return renderImageGrid(handle as ComponentHandle<{ items: Array<{ src: string; alt: string; caption?: string }>; cols?: number | 'auto'; gap?: number; minWidth?: number }>);
    case 'code':
      return renderCode(handle as ComponentHandle<{ content: string; lang?: string }>);
    case 'json':
      return renderJson(handle as ComponentHandle<{ label?: string; data: unknown }>);
    case 'table':
      return renderTable(handle as TableHandle);
    case 'metric':
      return renderMetric(handle as MetricHandle);
    case 'progress':
      return renderProgress(handle as ProgressHandle);
    case 'shell':
      return renderShell(handle as ComponentHandle<{ regions: Record<string, string[]>; opts: { sidebarPosition?: 'left' | 'right'; sidebarWidth?: string } }>, byId ?? new Map());
    case 'grid':
      return renderGrid(handle as ComponentHandle<{ cells: string[][]; opts: { cols?: number | string[]; rows?: number | string[]; gap?: number; minWidth?: number } }>, byId ?? new Map());
    case 'tabs':
      return renderTabs(handle as ComponentHandle<Record<string, unknown>, string>, byId ?? new Map());
    case 'card':
      return renderCard(handle as ComponentHandle<{ title?: string; ids: string[] }>, byId ?? new Map());
    case 'divider':
      return renderDivider(handle as ComponentHandle<{ label?: string }>);
    case 'spacer':
      return renderSpacer(handle as ComponentHandle<{ size: number | 'sm' | 'md' | 'lg' }>);
    case 'alert':
      return renderAlert(handle as ComponentHandle<{ message: string; type?: 'info' | 'success' | 'warning' | 'error'; title?: string }>);
    case 'loading':
      return renderLoading(handle as ComponentHandle<{ message: string; mode?: 'fullpage' | 'inline'; size?: 'sm' | 'md' | 'lg' }>);
    case 'streamText':
      return renderStreamText(handle as StreamHandle);
    case 'chatUI':
      return renderChat(handle as ChatHandle);
    default: {
      const unknownHandle = handle as unknown as { type: string; id: string };
      return `<div class="lk-component lk-component--${escapeHtml(unknownHandle.type)}" data-lk-id="${unknownHandle.id}"></div>`;
    }
  }
}

export function renderPage(components: AnyComponentHandle[]): string {
  const byId = new Map<string, AnyComponentHandle>(components.map((component) => [component.id, component]));
  const ownedByContainer = new Set<string>();
  const consumed = new Set<string>();
  const output: string[] = [];

  for (const component of components) {
    if (component.type === 'shell') {
      const shellProps = component.props as { regions: Record<string, string[]> };
      for (const ids of Object.values(shellProps.regions)) {
        for (const id of ids) {
          ownedByContainer.add(id);
        }
      }
      continue;
    }

    if (component.type === 'grid') {
      const gridProps = component.props as { cells: string[][] };
      for (const cell of gridProps.cells) {
        for (const id of cell) {
          ownedByContainer.add(id);
        }
      }
      continue;
    }

    if (component.type === 'tabs') {
      const tabsProps = component.props as { tabs: Array<{ ids: string[] }> };
      for (const tab of tabsProps.tabs) {
        for (const id of tab.ids) {
          ownedByContainer.add(id);
        }
      }
      continue;
    }

    if (component.type === 'card') {
      const cardProps = component.props as { ids: string[] };
      for (const id of cardProps.ids) {
        ownedByContainer.add(id);
      }
    }
  }

  for (const component of components) {
    if (consumed.has(component.id)) {
      continue;
    }

    // Components owned by shell/grid/tabs/card are rendered by their parent container.
    if (ownedByContainer.has(component.id)) {
      consumed.add(component.id);
      continue;
    }

    output.push(renderComponent(component, byId));
    consumed.add(component.id);
  }

  return output.join('\n');
}
