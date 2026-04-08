import type {
  AlertOpts,
  AnyComponentHandle,
  ButtonCallbackHandle,
  ButtonHandle,
  ButtonOpts,
  ChatHandle,
  ChatUIOptions,
  ChatUIProps,
  CodeProps,
  ComponentHandle,
  ConnectionScope,
  FileUploadHandle,
  FileUploadOpts,
  GridOpts,
  ImageGridProps,
  ImageProps,
  JsonProps,
  LoadingOpts,
  MarkdownProps,
  MetricHandle,
  MetricOpts,
  NumberInputHandle,
  NumberInputOpts,
  ProgressHandle,
  ProgressOpts,
  PromptEditorHandle,
  PromptEditorOpts,
  PromptEditorProps,
  SelectHandle,
  SelectOption,
  SelectOpts,
  ShellOpts,
  ShellRegions,
  SliderHandle,
  SliderOpts,
  StreamHandle,
  StreamTextOpts,
  TabDef,
  TabsOpts,
  TableHandle,
  TableProps,
  TableRow,
  TableRowHandle,
  TextHandle,
  TextInputHandle,
  TextInputOpts,
  ToggleHandle,
  ToggleOpts,
  ToastOpts,
  UIContext as IUIContext,
  UploadedFile,
} from './types';
import { createComponentId } from './id';

type PassiveComponentType = 'markdown' | 'image' | 'imageGrid' | 'code' | 'json' | 'shell' | 'grid' | 'card' | 'divider' | 'spacer' | 'alert' | 'loading';

export class UIContext implements IUIContext {
  public constructor(public readonly scope: ConnectionScope) {}

  get viewport() {
    return this.scope.viewport;
  }

  get theme() {
    return this.scope.theme;
  }

  setTheme(mode: 'light' | 'dark'): void {
    this.scope.theme = mode;
    this.scope.send({ type: 'THEME', payload: { mode } });
  }

  private register<T extends AnyComponentHandle>(handle: T): T {
    this.scope.registerHandle(handle);
    return handle;
  }

  private createPassiveHandle<T extends object>(type: PassiveComponentType, props: T): ComponentHandle<T> {
    const id = createComponentId(this.scope, type);
    const handle: ComponentHandle<T> = {
      id,
      type,
      props,
      value: undefined,
      update: (patch) => {
        Object.assign(handle.props, patch);
        this.scope.pushFragment(handle as AnyComponentHandle);
      },
    };
    this.register(handle as AnyComponentHandle);
    return handle;
  }

  text(content: string): TextHandle {
    const id = createComponentId(this.scope, 'text');
    const valueAtom = this.scope.getAtom<string>(`${id}/value`, content);
    const handle: TextHandle = {
      id,
      type: 'text',
      props: { content },
      get value() {
        return valueAtom.get();
      },
      update: (next: string) => {
        valueAtom.set(next);
        handle.props.content = next;
        this.scope.pushFragment(handle as AnyComponentHandle);
      },
    };
    return this.register(handle as AnyComponentHandle) as TextHandle;
  }

  button(
    label: string,
    onClick: (btn: ButtonCallbackHandle) => void | Promise<void>,
    opts: ButtonOpts = {},
  ): ButtonHandle {
    const id = createComponentId(this.scope, 'button');
    const valueAtom = this.scope.getAtom<boolean>(`${id}/value`, false);
    const handle: ButtonHandle = {
      id,
      type: 'button',
      props: { label, loading: false, onClick, ...opts },
      get value() {
        return valueAtom.get();
      },
      update: (patch) => {
        if (patch.label !== undefined)
          handle.props.label = String(patch.label);
        if (patch.loading !== undefined) {
          const loading = Boolean(patch.loading);
          valueAtom.set(loading);
          handle.props.loading = loading;
        }
        if (patch.variant !== undefined)
          handle.props.variant = patch.variant;
        if (patch.disabled !== undefined)
          handle.props.disabled = patch.disabled;
        this.scope.pushFragment(handle as AnyComponentHandle);
      },
      setLoading: (loading) => handle.update({ loading }),
    };
    return this.register(handle as AnyComponentHandle) as ButtonHandle;
  }

  textInput(label: string, opts: TextInputOpts = {}): TextInputHandle {
    const id = createComponentId(this.scope, 'textInput');
    const initial = opts.default ?? '';
    const valueAtom = this.scope.getAtom<string>(`${id}/value`, initial);
    const handle: TextInputHandle = {
      id,
      type: 'textInput',
      props: { label, value: initial, ...opts },
      get value() {
        return valueAtom.get();
      },
      update: (patch) => {
        if (patch.value !== undefined) {
          const next = String(patch.value);
          valueAtom.set(next);
          handle.props.value = next;
        }
        Object.assign(handle.props, patch);
        this.scope.pushFragment(handle as AnyComponentHandle);
      },
    };
    return this.register(handle as AnyComponentHandle) as TextInputHandle;
  }

  numberInput(label: string, opts: NumberInputOpts = {}): NumberInputHandle {
    const id = createComponentId(this.scope, 'numberInput');
    const initial = Number(opts.default ?? opts.min ?? 0);
    const valueAtom = this.scope.getAtom<number>(`${id}/value`, initial);
    const handle: NumberInputHandle = {
      id,
      type: 'numberInput',
      props: { label, value: initial, ...opts },
      get value() {
        return valueAtom.get();
      },
      update: (patch) => {
        if (patch.value !== undefined) {
          const next = Number(patch.value);
          valueAtom.set(next);
          handle.props.value = next;
        }
        Object.assign(handle.props, patch);
        this.scope.pushFragment(handle as AnyComponentHandle);
      },
    };
    return this.register(handle as AnyComponentHandle) as NumberInputHandle;
  }

  slider(label: string, opts: SliderOpts): SliderHandle {
    const id = createComponentId(this.scope, 'slider');
    const initial = Number(opts.default ?? opts.min);
    const valueAtom = this.scope.getAtom<number>(`${id}/value`, initial);
    const handle: SliderHandle = {
      id,
      type: 'slider',
      props: { label, value: initial, showValue: opts.showValue ?? true, ...opts },
      get value() {
        return valueAtom.get();
      },
      update: (patch) => {
        if (patch.value !== undefined) {
          const next = Number(patch.value);
          valueAtom.set(next);
          handle.props.value = next;
        }
        Object.assign(handle.props, patch);
        this.scope.pushFragment(handle as AnyComponentHandle);
      },
    };
    return this.register(handle as AnyComponentHandle) as SliderHandle;
  }

  toggle(label: string, opts: ToggleOpts = {}): ToggleHandle {
    const id = createComponentId(this.scope, 'toggle');
    const initial = Boolean(opts.default ?? false);
    const valueAtom = this.scope.getAtom<boolean>(`${id}/value`, initial);
    const handle: ToggleHandle = {
      id,
      type: 'toggle',
      props: { label, value: initial, ...opts },
      get value() {
        return valueAtom.get();
      },
      update: (patch) => {
        if (patch.value !== undefined) {
          const next = Boolean(patch.value);
          valueAtom.set(next);
          handle.props.value = next;
        }
        Object.assign(handle.props, patch);
        this.scope.pushFragment(handle as AnyComponentHandle);
      },
    };
    return this.register(handle as AnyComponentHandle) as ToggleHandle;
  }

  select(label: string, options: SelectOption[], opts: SelectOpts = {}): SelectHandle {
    const normalized = options.map((option) => (typeof option === 'string' ? { label: option, value: option } : option));
    const initial = opts.default ?? normalized[0]?.value ?? '';
    const id = createComponentId(this.scope, 'select');
    const valueAtom = this.scope.getAtom<string>(`${id}/value`, initial);
    const handle: SelectHandle = {
      id,
      type: 'select',
      props: { label, options: normalized, value: initial, ...opts },
      get value() {
        return valueAtom.get();
      },
      update: (patch) => {
        if (patch.value !== undefined) {
          const next = String(patch.value);
          valueAtom.set(next);
          handle.props.value = next;
        }
        Object.assign(handle.props, patch);
        this.scope.pushFragment(handle as AnyComponentHandle);
      },
    };
    return this.register(handle as AnyComponentHandle) as SelectHandle;
  }

  fileUpload(label: string, opts: FileUploadOpts = {}): FileUploadHandle {
    const id = createComponentId(this.scope, 'fileUpload');
    const initial: UploadedFile | UploadedFile[] | null = null;
    const valueAtom = this.scope.getAtom<UploadedFile | UploadedFile[] | null>(`${id}/value`, initial);
    const handle: FileUploadHandle = {
      id,
      type: 'fileUpload',
      props: {
        label,
        value: initial,
        dragDrop: opts.dragDrop ?? true,
        maxSize: opts.maxSize ?? 10 * 1024 * 1024,
        ...opts,
      },
      get value() {
        return valueAtom.get();
      },
      update: (patch) => {
        if (patch.value !== undefined) {
          valueAtom.set(patch.value as UploadedFile | UploadedFile[] | null);
          handle.props.value = patch.value as UploadedFile | UploadedFile[] | null;
        }
        Object.assign(handle.props, patch);
        this.scope.pushFragment(handle as AnyComponentHandle);
      },
    };
    return this.register(handle as AnyComponentHandle) as FileUploadHandle;
  }

  markdown(content: string): void {
    this.createPassiveHandle<MarkdownProps>('markdown', { content });
  }

  image(src: string | null | undefined, opts: Partial<ImageProps> = {}): void {
    this.createPassiveHandle<ImageProps>('image', {
      src,
      alt: opts.alt ?? 'Image',
      caption: opts.caption,
      width: opts.width,
      height: opts.height,
    });
  }

  imageGrid(
    sources: Array<string | { src: string; alt?: string; caption?: string }>,
    opts: Partial<ImageGridProps> = {},
  ): void {
    this.createPassiveHandle<ImageGridProps>('imageGrid', {
      items: sources.map((item) => (typeof item === 'string' ? { src: item, alt: 'Image' } : { src: item.src, alt: item.alt ?? 'Image', caption: item.caption })),
      cols: opts.cols,
      gap: opts.gap,
      minWidth: opts.minWidth,
    });
  }

  code(content: string, opts: Partial<CodeProps> = {}): void {
    this.createPassiveHandle<CodeProps>('code', { content, lang: opts.lang });
  }

  json(data: unknown, opts?: { label?: string }): void {
    this.createPassiveHandle<JsonProps>('json', { data, label: opts?.label });
  }

  table(data: TableRow[], opts: Partial<TableProps> = {}): TableHandle {
    const id = createComponentId(this.scope, 'table');
    const columns = opts.columns ?? Object.keys(data[0] ?? {});
    const rows = data.map((row, index) => ({ id: `${id}-row-${index + 1}`, data: { ...row } }));
    let rowClickHandler: ((row: TableRow) => void) | null = null;
    const tableHandle: TableHandle = {
      id,
      type: 'table',
      props: {
        columns,
        rows,
        striped: opts.striped ?? true,
        maxHeight: opts.maxHeight,
        emptyMessage: opts.emptyMessage ?? 'No data',
        onRowClick: undefined,
        getOnRowClick: () => rowClickHandler,
      },
      value: undefined,
      get rowCount() {
        return tableHandle.props.rows.length;
      },
      update: (patch) => {
        Object.assign(tableHandle.props, patch);
        this.scope.pushFragment(tableHandle as AnyComponentHandle);
      },
      append: (row) => {
        const rowHandle = this.createRowHandle(tableHandle);
        tableHandle.props.rows.push({ id: rowHandle.id, data: { ...row } });
        this.scope.pushFragment(tableHandle as AnyComponentHandle);
        return rowHandle;
      },
      prepend: (row) => {
        const rowHandle = this.createRowHandle(tableHandle);
        tableHandle.props.rows.unshift({ id: rowHandle.id, data: { ...row } });
        this.scope.pushFragment(tableHandle as AnyComponentHandle);
        return rowHandle;
      },
      remove: (rowId) => {
        tableHandle.props.rows = tableHandle.props.rows.filter((row) => row.id !== rowId);
        this.scope.pushFragment(tableHandle as AnyComponentHandle);
      },
      onRowClick: (handler) => {
        rowClickHandler = handler;
        tableHandle.props.onRowClick = handler;
      },
    };
    return this.register(tableHandle as AnyComponentHandle) as TableHandle;
  }

  private createRowHandle(table: TableHandle): TableRowHandle {
    const rowId = `${table.id}-row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return {
      id: rowId,
      update: (patch) => {
        const row = table.props.rows.find((entry) => entry.id === rowId);
        if (!row)
          return;
        Object.assign(row.data, patch);
        this.scope.pushFragment(table as AnyComponentHandle);
      },
      remove: () => {
        table.remove(rowId);
      },
    };
  }

  metric(label: string, value: string, opts: MetricOpts = {}): MetricHandle {
    const id = createComponentId(this.scope, 'metric');
    const valueAtom = this.scope.getAtom<string>(`${id}/value`, value);
    const handle: MetricHandle = {
      id,
      type: 'metric',
      props: { label, value, ...opts },
      get value() {
        return valueAtom.get();
      },
      update: (nextValue, nextOpts) => {
        valueAtom.set(nextValue);
        handle.props.value = nextValue;
        if (nextOpts)
          Object.assign(handle.props, nextOpts);
        this.scope.pushFragment(handle as AnyComponentHandle);
      },
    };
    return this.register(handle as AnyComponentHandle) as MetricHandle;
  }

  progress(value: number | null, opts: ProgressOpts = {}): ProgressHandle {
    const id = createComponentId(this.scope, 'progress');
    const valueAtom = this.scope.getAtom<number | null>(`${id}/value`, value);
    const handle: ProgressHandle = {
      id,
      type: 'progress',
      props: { value, ...opts },
      get value() {
        return valueAtom.get();
      },
      update: (nextValue, nextOpts) => {
        valueAtom.set(nextValue);
        handle.props.value = nextValue;
        if (nextOpts)
          Object.assign(handle.props, nextOpts);
        this.scope.pushFragment(handle as AnyComponentHandle);
      },
    };
    return this.register(handle as AnyComponentHandle) as ProgressHandle;
  }

  shell(regions: ShellRegions, opts: ShellOpts = {}): void {
    const renderRegion = (region?: (ctx: IUIContext) => void): string[] => {
      const before = this.scope.listHandles().length;
      if (region)
        region(this);
      return this.scope.listHandles().slice(before).map((h) => h.id);
    };

    this.createPassiveHandle('shell', {
      regions: {
        header: renderRegion(regions.header),
        sidebar: renderRegion(regions.sidebar),
        main: renderRegion(regions.main),
        footer: renderRegion(regions.footer),
      },
      opts,
    });
  }

  grid(areas: Array<(ctx: IUIContext) => void>, opts: GridOpts = {}): void {
    const cells = areas.map((area) => {
      const before = this.scope.listHandles().length;
      area(this);
      return this.scope.listHandles().slice(before).map((h) => h.id);
    });
    this.createPassiveHandle('grid', { cells, opts });
  }

  tabs(tabs: TabDef[], opts: TabsOpts = {}): ComponentHandle<Record<string, unknown>, string> {
    const id = createComponentId(this.scope, 'tabs');
    const initial = opts.defaultTab ?? tabs[0]?.label ?? '';
    const valueAtom = this.scope.getAtom<string>(`${id}/value`, initial);
    const renderedTabs = tabs.map((tab) => {
      const before = this.scope.listHandles().length;
      tab.content(this);
      return {
        label: tab.label,
        disabled: tab.disabled ?? false,
        ids: this.scope.listHandles().slice(before).map((h) => h.id),
      };
    });

    const handle: ComponentHandle<Record<string, unknown>, string> = {
      id,
      type: 'tabs',
      props: { tabs: renderedTabs, active: initial },
      get value() {
        return valueAtom.get();
      },
      update: (patch) => {
        Object.assign(handle.props, patch);
        if (patch.value !== undefined) {
          const next = String(patch.value);
          valueAtom.set(next);
          handle.props.active = next;
        }
        this.scope.pushFragment(handle as AnyComponentHandle);
      },
    };
    this.register(handle as AnyComponentHandle);
    return handle;
  }

  card(
    titleOrContent: string | ((ctx: IUIContext) => void),
    contentOrNothing?: (ctx: IUIContext) => void,
  ): void {
    const title = typeof titleOrContent === 'string' ? titleOrContent : undefined;
    const content = typeof titleOrContent === 'function' ? titleOrContent : contentOrNothing;
    const before = this.scope.listHandles().length;
    content?.(this);
    const ids = this.scope.listHandles().slice(before).map((h) => h.id);
    this.createPassiveHandle('card', { title, ids });
  }

  divider(opts?: { label?: string }): void {
    this.createPassiveHandle('divider', { label: opts?.label });
  }

  spacer(size: number | 'sm' | 'md' | 'lg' = 'md'): void {
    this.createPassiveHandle('spacer', { size });
  }

  toast(message: string, opts: ToastOpts = {}): void {
    this.scope.send({
      type: 'TOAST',
      payload: {
        message,
        type: opts.type ?? 'info',
        duration: opts.duration,
      },
    });
  }

  alert(message: string, opts: AlertOpts = {}): void {
    this.createPassiveHandle('alert', { message, ...opts });
  }

  loading(messageOrOpts?: string | LoadingOpts, opts: Omit<LoadingOpts, 'message'> = {}): void {
    if (typeof messageOrOpts === 'string') {
      this.createPassiveHandle('loading', { message: messageOrOpts, ...opts });
      return;
    }
    this.createPassiveHandle('loading', {
      message: messageOrOpts?.message ?? 'Loading...',
      mode: messageOrOpts?.mode ?? 'inline',
      size: messageOrOpts?.size ?? 'md',
    });
  }

  streamText(opts: StreamTextOpts = {}): StreamHandle {
    const id = createComponentId(this.scope, 'streamText');
    const textAtom = this.scope.getAtom<string>(`${id}/value`, '');
    const streamingAtom = this.scope.getAtom<boolean>(`${id}/streaming`, false);
    const handle: StreamHandle = {
      id,
      type: 'streamText',
      props: {
        text: '',
        isStreaming: false,
        format: opts.format ?? 'markdown',
        cursor: opts.cursor ?? true,
        label: opts.label,
        maxHeight: opts.maxHeight,
      },
      get value() {
        return textAtom.get();
      },
      get text() {
        return textAtom.get();
      },
      get isStreaming() {
        return streamingAtom.get();
      },
      update: (patch) => {
        Object.assign(handle.props, patch);
        if (patch.text !== undefined)
          textAtom.set(patch.text);
        if (patch.isStreaming !== undefined)
          streamingAtom.set(Boolean(patch.isStreaming));
        this.scope.pushFragment(handle as AnyComponentHandle);
      },
      append: (chunk) => {
        const next = `${textAtom.get()}${chunk}`;
        textAtom.set(next);
        handle.props.text = next;
        streamingAtom.set(true);
        handle.props.isStreaming = true;
        this.scope.send({
          type: 'STREAM_CHUNK',
          payload: {
            id: handle.id,
            chunk,
            done: false,
            format: handle.props.format ?? 'markdown',
          },
        });
      },
      done: () => {
        streamingAtom.set(false);
        handle.props.isStreaming = false;
        this.scope.send({
          type: 'STREAM_CHUNK',
          payload: {
            id: handle.id,
            chunk: '',
            done: true,
            format: handle.props.format ?? 'markdown',
          },
        });
      },
      clear: () => {
        textAtom.set('');
        handle.props.text = '';
        streamingAtom.set(false);
        handle.props.isStreaming = false;
        this.scope.pushFragment(handle as AnyComponentHandle);
      },
    };
    return this.register(handle as AnyComponentHandle) as StreamHandle;
  }

  chatUI(opts: ChatUIOptions = {}): ChatHandle {
    const id = createComponentId(this.scope, 'chatUI');
    const messagesAtom = this.scope.getAtom<ChatUIProps['messages']>(`${id}/messages`, []);
    const handle: ChatHandle = {
      id,
      type: 'chatUI',
      props: { messages: messagesAtom.get(), ...opts },
      get value() {
        return messagesAtom.get();
      },
      get lastMessage() {
        const messages = messagesAtom.get();
        return messages.length > 0 ? messages[messages.length - 1] : null;
      },
      update: (patch) => {
        Object.assign(handle.props, patch);
        if (patch.messages !== undefined) {
          messagesAtom.set(patch.messages);
          handle.props.messages = patch.messages;
        }
        this.scope.pushFragment(handle as AnyComponentHandle);
      },
      addMessage: (role, content) => {
        const next = [...messagesAtom.get(), { role, content, timestamp: Date.now() }];
        messagesAtom.set(next);
        handle.props.messages = next;
        this.scope.pushFragment(handle as AnyComponentHandle);
      },
      clear: () => {
        messagesAtom.set([]);
        handle.props.messages = [];
        this.scope.pushFragment(handle as AnyComponentHandle);
      },
    };
    return this.register(handle as AnyComponentHandle) as ChatHandle;
  }

  promptEditor(opts: PromptEditorOpts = {}): PromptEditorHandle {
    const id = createComponentId(this.scope, 'promptEditor');
    const initial = opts.default ?? '';
    const valueAtom = this.scope.getAtom<string>(`${id}/value`, initial);
    const handle: PromptEditorHandle = {
      id,
      type: 'promptEditor',
      props: {
        label: opts.label ?? 'Prompt',
        multiline: true,
        rows: opts.rows ?? 5,
        showCharCount: opts.showCharCount ?? true,
        variables: opts.variables ?? [],
        ...opts,
        value: initial,
      } as PromptEditorProps,
      get value() {
        return valueAtom.get();
      },
      update: (patch) => {
        if (patch.value !== undefined) {
          const next = String(patch.value);
          valueAtom.set(next);
          handle.props.value = next;
        }
        Object.assign(handle.props, patch);
        this.scope.pushFragment(handle as AnyComponentHandle);
      },
      interpolate: (vars: Record<string, string>) =>
        valueAtom.get().replaceAll(/\{\{([\w-]+)\}\}/g, (_, key: string) => vars[key] ?? ''),
    };
    return this.register(handle as AnyComponentHandle) as PromptEditorHandle;
  }

  onDisconnect(fn: () => void): void {
    this.scope.onCleanup(fn);
  }
}
