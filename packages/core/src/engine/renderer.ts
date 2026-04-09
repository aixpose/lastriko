import type {
  AnyComponentHandle,
  ButtonHandle,
  ChatHandle,
  ComponentHandle,
  FileUploadHandle,
  MetricHandle,
  NumberInputHandle,
  ProgressHandle,
  PromptEditorHandle,
  SelectHandle,
  SliderHandle,
  StreamHandle,
  TableHandle,
  TextHandle,
  TextInputHandle,
  ToggleHandle,
} from '../components/types';
import { renderMarkdownToSafeHtml } from './markdown';
import { renderCodeHtml } from './code-highlight';

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
    'aria-label': handle.props.label,
  });
  const spinner = handle.props.loading ? '<span class="lk-spinner" aria-hidden="true"></span>' : '';
  return `<button${attrs}>${spinner}<span>${escapeHtml(handle.props.label)}</span></button>`;
}

function renderTextInput(handle: TextInputHandle | PromptEditorHandle): string {
  const commonAttrs = renderAttributes({
    'data-lk-id': handle.id,
    'data-lk-kind': handle.type,
    'data-lk-event': 'change input',
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
    'data-lk-event': 'change blur-clamp',
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
  const maxSize = Number(handle.props.maxSize);
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
  const maxSizeAttr = Number.isFinite(maxSize) && maxSize > 0 ? ` data-lk-max-size="${String(maxSize)}"` : '';
  return `<div class="lk-field lk-file-upload" data-lk-id="${handle.id}" data-lk-kind="fileUpload"${maxSizeAttr}>${renderInputLabel(label, helperText)}<input${attrs} /><div class="lk-file-upload-value">${escapeHtml(valueLabel)}</div></div>`;
}

function renderMultiSelect(handle: ComponentHandle<{ label: string; options: Array<{ label: string; value: string; disabled?: boolean }>; value: string[]; disabled?: boolean; helperText?: string }>): string {
  const selected = new Set(handle.props.value);
  const options = handle.props.options.map((option, index) => {
    const checked = selected.has(option.value);
    const attrs = renderAttributes({
      'type': 'checkbox',
      'value': option.value,
      checked,
      'disabled': handle.props.disabled || option.disabled,
      'data-lk-event': 'change',
      'data-lk-multi-option': 'true',
      'aria-label': option.label,
    });
    return `<label class="lk-multi-option"><input${attrs} /><span>${escapeHtml(option.label)}</span></label>`;
  }).join('');
  const helper = handle.props.helperText ? `<div class="lk-helper">${escapeHtml(handle.props.helperText)}</div>` : '';
  return `<fieldset class="lk-field lk-multi" data-lk-id="${handle.id}" data-lk-kind="multiSelect"><legend class="lk-label">${escapeHtml(handle.props.label)}</legend>${helper}<div class="lk-multi-options">${options}</div></fieldset>`;
}

function renderColorPicker(handle: ComponentHandle<{ label: string; value: string; format?: string; disabled?: boolean; helperText?: string; swatches?: string[] }>): string {
  const attrs = renderAttributes({
    'type': 'color',
    'value': handle.props.value,
    'disabled': handle.props.disabled,
    'data-lk-event': 'change',
    'aria-label': handle.props.label,
  });
  const swatches = (handle.props.swatches ?? []).map((swatch) => `<button class="lk-color-swatch" type="button" data-lk-event="click pick-swatch" data-lk-swatch="${escapeHtml(swatch)}" style="background:${escapeHtml(swatch)}" aria-label="Use ${escapeHtml(swatch)}"></button>`).join('');
  const swatchWrap = swatches ? `<div class="lk-color-swatches">${swatches}</div>` : '';
  return `<div class="lk-field lk-color" data-lk-id="${handle.id}" data-lk-kind="colorPicker">${renderInputLabel(handle.props.label, handle.props.helperText ?? '')}<div class="lk-color-row"><input${attrs} /><code class="lk-color-value">${escapeHtml(handle.props.value)}</code></div>${swatchWrap}</div>`;
}

function renderDateInput(handle: ComponentHandle<{ label: string; value: string; type?: string; min?: string; max?: string; disabled?: boolean; helperText?: string }>): string {
  const attrs = renderAttributes({
    'type': handle.props.type ?? 'date',
    'value': handle.props.value,
    'min': handle.props.min,
    'max': handle.props.max,
    'disabled': handle.props.disabled,
    'data-lk-event': 'change',
    'aria-label': handle.props.label,
  });
  return `<div class="lk-field lk-date" data-lk-id="${handle.id}">${renderInputLabel(handle.props.label, handle.props.helperText ?? '')}<input${attrs} /></div>`;
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

function renderVideo(handle: ComponentHandle<{ src: string; controls?: boolean; autoplay?: boolean; muted?: boolean; loop?: boolean; poster?: string; width?: string; caption?: string }>): string {
  const attrs = renderAttributes({
    src: handle.props.src,
    controls: handle.props.controls ?? true,
    autoplay: handle.props.autoplay,
    muted: handle.props.muted,
    loop: handle.props.loop,
    poster: handle.props.poster,
    width: handle.props.width ?? '100%',
    loading: 'lazy',
  });
  const caption = handle.props.caption ? `<figcaption>${escapeHtml(handle.props.caption)}</figcaption>` : '';
  return `<figure class="lk-video" data-lk-id="${handle.id}"><video${attrs}></video>${caption}</figure>`;
}

function renderAudio(handle: ComponentHandle<{ src: string; controls?: boolean; autoplay?: boolean; loop?: boolean; label?: string }>): string {
  const attrs = renderAttributes({
    'src': handle.props.src,
    'controls': handle.props.controls ?? true,
    'autoplay': handle.props.autoplay,
    'loop': handle.props.loop,
    'aria-label': handle.props.label ?? 'Audio player',
  });
  return `<div class="lk-audio" data-lk-id="${handle.id}"><audio${attrs}></audio></div>`;
}

function renderCode(handle: ComponentHandle<{ content: string; lang?: string }>): string {
  const lang = handle.props.lang ?? 'text';
  const highlighted = renderCodeHtml(handle.props.content, lang);
  const codeHtml = highlighted || escapeHtml(handle.props.content);
  return `<div class="lk-code-wrap" data-lk-id="${handle.id}"><button class="lk-code-copy" type="button" data-lk-event="click copy-code" aria-label="Copy code">Copy</button><pre class="lk-code" data-lk-lang="${escapeHtml(lang)}"><code>${codeHtml}</code></pre><pre class="lk-code-source" hidden>${escapeHtml(handle.props.content)}</pre></div>`;
}

function renderJson(handle: ComponentHandle<{ label?: string; data: unknown }>): string {
  const label = handle.props.label ? `<div class="lk-json-label">${escapeHtml(handle.props.label)}</div>` : '';
  const json = escapeHtml(JSON.stringify(handle.props.data, null, 2) ?? 'null');
  return `<div class="lk-json" data-lk-id="${handle.id}">${label}<details class="lk-json-details" open><summary>JSON</summary><pre>${json}</pre></details></div>`;
}

function renderDiff(handle: ComponentHandle<{ before: string; after: string; mode?: 'split' | 'unified'; beforeLabel?: string; afterLabel?: string }>): string {
  const beforeLines = handle.props.before.split('\n');
  const afterLines = handle.props.after.split('\n');
  const max = Math.max(beforeLines.length, afterLines.length);
  const rows: string[] = [];
  for (let i = 0; i < max; i += 1) {
    const left = beforeLines[i] ?? '';
    const right = afterLines[i] ?? '';
    const same = left === right;
    const leftCls = same ? 'ctx' : (left ? 'removed lk-diff-line--removed' : 'ctx');
    const rightCls = same ? 'ctx' : (right ? 'added lk-diff-line--added' : 'ctx');
    if (handle.props.mode === 'unified') {
      if (!same && left) {
        rows.push(`<div class="lk-diff-line removed lk-diff-line--removed">- ${escapeHtml(left)}</div>`);
      }
      if (!same && right) {
        rows.push(`<div class="lk-diff-line added lk-diff-line--added">+ ${escapeHtml(right)}</div>`);
      }
      if (same) {
        rows.push(`<div class="lk-diff-line ctx">  ${escapeHtml(left)}</div>`);
      }
    } else {
      rows.push(`<div class="lk-diff-row"><div class="lk-diff-line ${leftCls}">${escapeHtml(left)}</div><div class="lk-diff-line ${rightCls}">${escapeHtml(right)}</div></div>`);
    }
  }
  if (handle.props.mode === 'unified') {
    return `<section class="lk-diff lk-diff--unified" data-lk-id="${handle.id}"><header class="lk-diff-header"><span>${escapeHtml(handle.props.beforeLabel ?? 'Before')}</span><span>${escapeHtml(handle.props.afterLabel ?? 'After')}</span></header><div class="lk-diff-body">${rows.join('')}</div></section>`;
  }
  return `<section class="lk-diff lk-diff--split" data-lk-id="${handle.id}"><header class="lk-diff-header"><span>${escapeHtml(handle.props.beforeLabel ?? 'Before')}</span><span>${escapeHtml(handle.props.afterLabel ?? 'After')}</span></header><div class="lk-diff-body">${rows.join('')}</div></section>`;
}

function renderTable(handle: TableHandle): string {
  const head = handle.props.columns.map((column) => `<th scope="col" aria-sort="none">${escapeHtml(column)}</th>`).join('');
  const isVirtualized = handle.props.rows.length > 100;
  const rowHeight = 36;
  const maxHeight = handle.props.maxHeight ?? (isVirtualized ? 420 : undefined);
  const initialVisibleRows = maxHeight
    ? Math.ceil(maxHeight / rowHeight) + 6
    : 16;
  const rowsToRender = isVirtualized
    ? handle.props.rows.slice(0, Math.max(8, initialVisibleRows))
    : handle.props.rows;
  const body = rowsToRender.length > 0
    ? rowsToRender.map((row) => {
        const cells = handle.props.columns.map((column) => `<td>${escapeHtml(String(row.data[column] ?? ''))}</td>`).join('');
        return `<tr data-lk-table-row-id="${row.id}">${cells}</tr>`;
      }).join('')
    : `<tr><td colspan="${Math.max(1, handle.props.columns.length)}">${escapeHtml(handle.props.emptyMessage ?? 'No data')}</td></tr>`;
  const style = maxHeight ? `style="max-height:${maxHeight}px;overflow:auto;display:block;"` : '';
  const virtualAttrs = isVirtualized
    ? ` data-lk-virtualized="true" data-lk-table-row-height="${rowHeight}" data-lk-table-empty="${escapeHtml(handle.props.emptyMessage ?? 'No data')}" data-lk-table-rows="${escapeHtml(JSON.stringify(handle.props.rows))}" data-lk-table-columns="${escapeHtml(JSON.stringify(handle.props.columns))}"`
    : '';
  return `<div class="lk-table-wrap" data-lk-id="${handle.id}" data-lk-kind="table" data-lk-scroll-container="${handle.id}"${virtualAttrs} ${style}><table class="lk-table${handle.props.striped ? ' lk-table--striped' : ''}"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
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
  const hasHeader = handle.props.regions.header.length > 0;
  const hasSidebar = handle.props.regions.sidebar.length > 0;
  const toggleId = `${handle.id}-drawer-toggle`;
  const mobileToggle = hasSidebar
    ? `<input id="${escapeHtml(toggleId)}" class="lk-shell-mobile-toggle" type="checkbox" />`
    : '';
  const mobileButton = hasSidebar && hasHeader
    ? `<label class="lk-shell-mobile-button" for="${escapeHtml(toggleId)}" aria-label="Toggle navigation">☰</label>`
    : '';
  const floatingMobileButton = hasSidebar && !hasHeader
    ? `<label class="lk-shell-mobile-button lk-shell-mobile-button--floating" for="${escapeHtml(toggleId)}" aria-label="Toggle navigation">☰</label>`
    : '';
  const backdrop = hasSidebar
    ? `<label class="lk-shell-backdrop" for="${escapeHtml(toggleId)}" aria-hidden="true"></label>`
    : '';
  return `<section class="lk-shell lk-shell--sidebar-${escapeHtml(sidebarPosition)}" data-lk-id="${handle.id}" style="--lk-sidebar-width:${escapeHtml(sidebarWidth)};">
    ${mobileToggle}
    ${hasHeader ? `<header class="lk-shell-header">${mobileButton}${renderRegion(handle.props.regions.header)}</header>` : ''}
    ${hasSidebar ? `<aside class="lk-shell-sidebar">${renderRegion(handle.props.regions.sidebar)}</aside>` : ''}
    <main class="lk-shell-main">${renderRegion(handle.props.regions.main)}</main>
    ${handle.props.regions.footer.length ? `<footer class="lk-shell-footer">${renderRegion(handle.props.regions.footer)}</footer>` : ''}
    ${floatingMobileButton}
    ${backdrop}
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
    const isActive = tab.label === active;
    const disabledAttr = tab.disabled ? ' disabled' : '';
    return `<button class="lk-tab${isActive ? ' is-active' : ''}" type="button"${disabledAttr} role="tab" aria-selected="${isActive ? 'true' : 'false'}" tabindex="${isActive ? '0' : '-1'}" data-lk-tab-target="${escapeHtml(tab.label)}">${escapeHtml(tab.label)}</button>`;
  }).join('');
  const bodies = props.tabs.map((tab) => {
    const hidden = tab.label === active ? '' : 'hidden';
    const content = tab.ids.map((id) => byId.get(id)).filter(Boolean).map((child) => renderComponent(child as AnyComponentHandle, byId)).join('');
    return `<section class="lk-tab-panel" role="tabpanel" data-lk-tab-panel="${escapeHtml(tab.label)}" ${hidden}>${content}</section>`;
  }).join('');
  return `<div class="lk-tabs" data-lk-id="${handle.id}"><nav class="lk-tab-nav" role="tablist">${nav}</nav>${bodies}</div>`;
}

function renderAccordion(handle: ComponentHandle<{ sections: Array<{ label: string; defaultOpen: boolean; ids: string[] }>; opts: { allowMultiple: boolean } }>, byId: Map<string, AnyComponentHandle>): string {
  const sections = handle.props.sections.map((section, index) => {
    const body = section.ids.map((id) => byId.get(id)).filter(Boolean).map((child) => renderComponent(child as AnyComponentHandle, byId)).join('');
    const openAttr = section.defaultOpen ? ' open' : '';
    return `<details class="lk-accordion-item"${openAttr} data-lk-accordion-item="${index}"><summary>${escapeHtml(section.label)}</summary><div class="lk-accordion-body">${body}</div></details>`;
  }).join('');
  return `<section class="lk-accordion" data-lk-id="${handle.id}" data-lk-allow-multiple="${handle.props.opts.allowMultiple ? 'true' : 'false'}">${sections}</section>`;
}

function renderFullscreen(handle: ComponentHandle<{ ids: string[]; trigger: 'button' | 'manual'; label: string; open: boolean }>, byId: Map<string, AnyComponentHandle>): string {
  const content = handle.props.ids.map((id) => byId.get(id)).filter(Boolean).map((child) => renderComponent(child as AnyComponentHandle, byId)).join('');
  const openClass = handle.props.open ? ' is-open' : '';
  const trigger = handle.props.trigger === 'button'
    ? `<button type="button" class="lk-fullscreen-open" data-lk-event="click fullscreen-open" aria-label="${escapeHtml(handle.props.label)}">${escapeHtml(handle.props.label)}</button>`
    : '';
  return `<section class="lk-fullscreen${openClass}" data-lk-id="${handle.id}">${trigger}<div class="lk-fullscreen-overlay" role="dialog" aria-modal="true" ${handle.props.open ? '' : 'hidden'}><button type="button" class="lk-fullscreen-close" data-lk-event="click fullscreen-close" aria-label="Close fullscreen">Close</button><div class="lk-fullscreen-content">${content}</div></div></section>`;
}

function renderModelCompare(handle: ComponentHandle<{ models: Array<{ label: string; model: string; provider: string; color?: string }>; value: { results: Record<string, string>; isStreaming: Record<string, boolean>; errors: Record<string, string | null>; latencies: Record<string, number> } }>): string {
  const columns = handle.props.models.map((model) => {
    const result = handle.props.value.results[model.label] ?? '';
    const err = handle.props.value.errors[model.label];
    const latency = handle.props.value.latencies[model.label] ?? 0;
    const body = err ? `<div class="lk-model-error">${escapeHtml(err)}</div>` : `<pre class="lk-model-result">${escapeHtml(result)}</pre>`;
    return `<article class="lk-model-col" style="${model.color ? `--lk-model-color:${escapeHtml(model.color)};` : ''}"><header><strong>${escapeHtml(model.label)}</strong><span>${escapeHtml(model.provider)} / ${escapeHtml(model.model)}</span></header>${body}<footer>${latency}ms</footer></article>`;
  }).join('');
  return `<section class="lk-model-compare" data-lk-id="${handle.id}">${columns}</section>`;
}

function renderParameterPanel(handle: ComponentHandle<{ title?: string; collapsible?: boolean; ids: string[] }>, byId: Map<string, AnyComponentHandle>): string {
  const body = handle.props.ids.map((id) => byId.get(id)).filter(Boolean).map((child) => renderComponent(child as AnyComponentHandle, byId)).join('');
  const title = handle.props.title ? `<header class="lk-parameter-title">${escapeHtml(handle.props.title)}</header>` : '';
  if (handle.props.collapsible) {
    return `<section class="lk-parameter-panel" data-lk-id="${handle.id}"><details open><summary>${escapeHtml(handle.props.title ?? 'Parameters')}</summary><div class="lk-parameter-body">${body}</div></details></section>`;
  }
  return `<section class="lk-parameter-panel" data-lk-id="${handle.id}">${title}<div class="lk-parameter-body">${body}</div></section>`;
}

function renderFilmStrip(handle: ComponentHandle<{ images: Array<{ src: string; alt?: string; caption?: string; thumbnail?: string }>; height?: number; selectedIndex?: number; showCaptions?: boolean }>): string {
  const items = handle.props.images.map((image, index) => {
    const src = image.thumbnail ?? image.src;
    const selected = index === (handle.props.selectedIndex ?? 0);
    const caption = image.caption && handle.props.showCaptions ? `<span class="lk-film-caption">${escapeHtml(image.caption)}</span>` : '';
    return `<button type="button" class="lk-film-item${selected ? ' is-selected' : ''}" data-lk-event="click filmstrip-select" data-lk-index="${index}" data-lk-src="${escapeHtml(image.src)}" data-lk-alt="${escapeHtml(image.alt ?? 'Image')}" aria-selected="${selected ? 'true' : 'false'}" aria-label="Select image ${index + 1}"><img src="${escapeHtml(src)}" alt="${escapeHtml(image.alt ?? 'Image')}" loading="lazy" style="height:${handle.props.height ?? 120}px" />${caption}</button>`;
  }).join('');
  const selected = handle.props.images[handle.props.selectedIndex ?? 0];
  const selectedHtml = selected ? `<figure class="lk-film-strip-viewer"><img src="${escapeHtml(selected.src)}" alt="${escapeHtml(selected.alt ?? 'Image')}" loading="lazy" /></figure>` : '';
  return `<section class="lk-film-strip" data-lk-id="${handle.id}">${selectedHtml}<div class="lk-film-row" role="listbox">${items}</div></section>`;
}

function renderBeforeAfter(handle: ComponentHandle<{ before: string; after: string; beforeLabel?: string; afterLabel?: string; initialPosition?: number; orientation?: 'horizontal' | 'vertical' }>): string {
  const pos = Math.max(0, Math.min(100, Number(handle.props.initialPosition ?? 50)));
  return `<section class="lk-before-after" data-lk-id="${handle.id}" data-lk-kind="beforeAfter" data-lk-position="${pos}" data-lk-orientation="${escapeHtml(handle.props.orientation ?? 'horizontal')}">
    <figure class="lk-before"><img src="${escapeHtml(handle.props.before)}" alt="${escapeHtml(handle.props.beforeLabel ?? 'Before')}" loading="lazy" /></figure>
    <figure class="lk-after lk-before-after-after" style="clip-path: inset(0 ${100 - pos}% 0 0);"><img src="${escapeHtml(handle.props.after)}" alt="${escapeHtml(handle.props.afterLabel ?? 'After')}" loading="lazy" /></figure>
    <input type="range" class="lk-before-after-range" min="0" max="100" value="${pos}" data-lk-event="before-after-drag" aria-label="Adjust comparison" />
    <button type="button" class="lk-before-after-handle" data-lk-before-after-handle aria-hidden="true" tabindex="-1"></button>
    <div class="lk-before-after-labels"><span>${escapeHtml(handle.props.beforeLabel ?? 'Before')}</span><span>${escapeHtml(handle.props.afterLabel ?? 'After')}</span></div>
  </section>`;
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
  return `<div class="lk-stream" data-lk-id="${handle.id}"><div class="lk-stream-body" data-lk-stream-body data-lk-text="${escapeHtml(text)}" aria-live="polite">${body}</div>${cursor}</div>`;
}

function renderChat(handle: ChatHandle): string {
  const messages = handle.props.messages.map((message) => `<div class="lk-chat-msg lk-chat-msg--${escapeHtml(message.role)}"><span class="lk-chat-role">${escapeHtml(message.role)}</span><p>${escapeHtml(message.content)}</p></div>`).join('');
  return `<section class="lk-chat" data-lk-id="${handle.id}"><div class="lk-chat-history" data-lk-scroll-container="${handle.id}-history" aria-live="polite">${messages}</div></section>`;
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
    case 'multiSelect':
      return renderMultiSelect(handle as ComponentHandle<{ label: string; options: Array<{ label: string; value: string; disabled?: boolean }>; value: string[]; disabled?: boolean; helperText?: string }>);
    case 'colorPicker':
      return renderColorPicker(handle as ComponentHandle<{ label: string; value: string; format?: string; disabled?: boolean; helperText?: string; swatches?: string[] }>);
    case 'dateInput':
      return renderDateInput(handle as ComponentHandle<{ label: string; value: string; type?: string; min?: string; max?: string; disabled?: boolean; helperText?: string }>);
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
    case 'video':
      return renderVideo(handle as ComponentHandle<{ src: string; controls?: boolean; autoplay?: boolean; muted?: boolean; loop?: boolean; poster?: string; width?: string; caption?: string }>);
    case 'audio':
      return renderAudio(handle as ComponentHandle<{ src: string; controls?: boolean; autoplay?: boolean; loop?: boolean; label?: string }>);
    case 'code':
      return renderCode(handle as ComponentHandle<{ content: string; lang?: string }>);
    case 'json':
      return renderJson(handle as ComponentHandle<{ label?: string; data: unknown }>);
    case 'diff':
      return renderDiff(handle as ComponentHandle<{ before: string; after: string; mode?: 'split' | 'unified'; beforeLabel?: string; afterLabel?: string }>);
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
    case 'accordion':
      return renderAccordion(handle as ComponentHandle<{ sections: Array<{ label: string; defaultOpen: boolean; ids: string[] }>; opts: { allowMultiple: boolean } }>, byId ?? new Map());
    case 'fullscreen':
      return renderFullscreen(handle as ComponentHandle<{ ids: string[]; trigger: 'button' | 'manual'; label: string; open: boolean }>, byId ?? new Map());
    case 'modelCompare':
      return renderModelCompare(handle as ComponentHandle<{ models: Array<{ label: string; model: string; provider: string; color?: string }>; value: { results: Record<string, string>; isStreaming: Record<string, boolean>; errors: Record<string, string | null>; latencies: Record<string, number> } }>);
    case 'parameterPanel':
      return renderParameterPanel(handle as ComponentHandle<{ title?: string; collapsible?: boolean; ids: string[] }>, byId ?? new Map());
    case 'filmStrip':
      return renderFilmStrip(handle as ComponentHandle<{ images: Array<{ src: string; alt?: string; caption?: string; thumbnail?: string }>; height?: number; selectedIndex?: number; showCaptions?: boolean }>);
    case 'beforeAfter':
      return renderBeforeAfter(handle as ComponentHandle<{ before: string; after: string; beforeLabel?: string; afterLabel?: string; initialPosition?: number; orientation?: 'horizontal' | 'vertical' }>);
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
    if (component.type === 'accordion') {
      const props = component.props as { sections: Array<{ ids: string[] }> };
      for (const section of props.sections) {
        for (const id of section.ids) {
          ownedByContainer.add(id);
        }
      }
      continue;
    }
    if (component.type === 'fullscreen') {
      const props = component.props as { ids: string[] };
      for (const id of props.ids) {
        ownedByContainer.add(id);
      }
      continue;
    }
    if (component.type === 'parameterPanel') {
      const props = component.props as { ids: string[] };
      for (const id of props.ids) {
        ownedByContainer.add(id);
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
    if (ownedByContainer.has(component.id)) {
      consumed.add(component.id);
      continue;
    }
    output.push(renderComponent(component, byId));
    consumed.add(component.id);
  }

  return output.join('\n');
}
