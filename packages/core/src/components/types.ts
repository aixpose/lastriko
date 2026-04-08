import type { WritableAtom } from 'nanostores';
import type { ServerToClientMessage, ThemeMode } from '../engine/messages';

export type ComponentType
  = | 'text'
    | 'button'
    | 'textInput'
    | 'numberInput'
    | 'slider'
    | 'toggle'
    | 'select'
    | 'fileUpload'
    | 'markdown'
    | 'image'
    | 'imageGrid'
    | 'code'
    | 'json'
    | 'table'
    | 'metric'
    | 'progress'
    | 'shell'
    | 'grid'
    | 'tabs'
    | 'card'
    | 'divider'
    | 'spacer'
    | 'alert'
    | 'loading'
    | 'streamText'
    | 'chatUI'
    | 'promptEditor';

export type TableRow = Record<string, unknown>;

export interface ComponentHandle<TProps, TValue = void> {
  readonly id: string;
  readonly type: ComponentType;
  props: TProps;
  readonly value: TValue;
  update(data: Partial<TProps & { value: TValue }>): void;
}

export interface InputHandle<TValue, TProps = Record<string, unknown>>
  extends ComponentHandle<TProps, TValue> {
  readonly value: TValue;
}

export interface ButtonCallbackHandle {
  setLoading(loading: boolean): void;
}

export interface ButtonOpts {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
}

export interface TextInputOpts {
  placeholder?: string;
  default?: string;
  multiline?: boolean;
  rows?: number;
  maxLength?: number;
  disabled?: boolean;
  helperText?: string;
  type?: 'text' | 'email' | 'url' | 'password';
}

export interface NumberInputOpts {
  min?: number;
  max?: number;
  step?: number;
  default?: number;
  disabled?: boolean;
  helperText?: string;
}

export interface SliderOpts {
  min: number;
  max: number;
  step?: number;
  default?: number;
  disabled?: boolean;
  helperText?: string;
  showValue?: boolean;
}

export interface ToggleOpts {
  default?: boolean;
  disabled?: boolean;
  helperText?: string;
  onLabel?: string;
  offLabel?: string;
}

export type SelectOption = string | { label: string; value: string; disabled?: boolean };

export interface SelectOpts {
  default?: string;
  disabled?: boolean;
  helperText?: string;
  placeholder?: string;
}

export interface FileUploadOpts {
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
  disabled?: boolean;
  helperText?: string;
  dragDrop?: boolean;
}

export interface UploadedFile {
  name: string;
  path: string;
  size: number;
  type: string;
}

export interface TextProps {
  content: string;
}

export interface ButtonProps extends ButtonOpts {
  label: string;
  loading: boolean;
  onClick: (btn: ButtonCallbackHandle) => void | Promise<void>;
}

export interface TextInputProps extends TextInputOpts {
  label: string;
  value: string;
}

export interface NumberInputProps extends NumberInputOpts {
  label: string;
  value: number;
}

export interface SliderProps extends SliderOpts {
  label: string;
  value: number;
}

export interface ToggleProps extends ToggleOpts {
  label: string;
  value: boolean;
}

export interface SelectProps extends SelectOpts {
  label: string;
  options: Array<{ label: string; value: string; disabled?: boolean }>;
  value: string;
}

export interface FileUploadProps extends FileUploadOpts {
  label: string;
  value: UploadedFile | UploadedFile[] | null;
}

export interface MarkdownProps {
  content: string;
}

export interface ImageProps {
  src: string | null | undefined;
  alt: string;
  caption?: string;
  width?: string | number;
  height?: string | number;
}

export interface ImageGridProps {
  items: Array<{ src: string; alt: string; caption?: string }>;
  cols?: number | 'auto';
  gap?: number;
  minWidth?: number;
}

export interface CodeProps {
  content: string;
  lang?: string;
}

export interface JsonProps {
  label?: string;
  data: unknown;
}

export interface TableProps {
  columns: string[];
  rows: Array<{ id: string; data: TableRow }>;
  striped?: boolean;
  maxHeight?: number;
  emptyMessage?: string;
  onRowClick?: (row: TableRow) => void;
  getOnRowClick?: () => ((row: TableRow) => void) | null;
}

export interface MetricOpts {
  delta?: number;
  deltaLabel?: string;
  unit?: string;
  prefix?: string;
}

export interface MetricProps extends MetricOpts {
  label: string;
  value: string;
}

export interface ProgressOpts {
  label?: string;
  showPercentage?: boolean;
  color?: 'accent' | 'success' | 'error' | 'warning';
}

export interface ProgressProps extends ProgressOpts {
  value: number | null;
}

export interface ShellOpts {
  sidebarPosition?: 'left' | 'right';
  sidebarWidth?: string;
}

export interface GridOpts {
  cols?: number | string[];
  rows?: number | string[];
  gap?: number;
  minWidth?: number;
}

export interface TabsOpts {
  defaultTab?: string;
}

export interface ToastOpts {
  type?: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
}

export interface AlertOpts {
  type?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
}

export interface LoadingOpts {
  message?: string;
  mode?: 'fullpage' | 'inline';
  size?: 'sm' | 'md' | 'lg';
}

export interface StreamTextOpts {
  format?: 'plain' | 'markdown';
  cursor?: boolean;
  label?: string;
  maxHeight?: number;
}

export interface StreamTextProps extends StreamTextOpts {
  text: string;
  isStreaming: boolean;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface ChatUIOptions {
  placeholder?: string;
  maxHeight?: number;
}

export interface ChatUIProps extends ChatUIOptions {
  messages: ChatMessage[];
}

export interface PromptEditorOpts extends TextInputOpts {
  label?: string;
  variables?: string[];
  showCharCount?: boolean;
}

export interface PromptEditorProps extends PromptEditorOpts {
  value: string;
}

export interface TextHandle extends Omit<ComponentHandle<TextProps, string>, 'update'> {
  readonly type: 'text';
  update(content: string): void;
}

export interface ButtonHandle extends ComponentHandle<ButtonProps, boolean> {
  readonly type: 'button';
  setLoading(loading: boolean): void;
}

export type TextInputHandle = InputHandle<string, TextInputProps>;
export type NumberInputHandle = InputHandle<number, NumberInputProps>;
export type SliderHandle = InputHandle<number, SliderProps>;
export type ToggleHandle = InputHandle<boolean, ToggleProps>;
export type SelectHandle = InputHandle<string, SelectProps>;
export type FileUploadHandle = InputHandle<UploadedFile | UploadedFile[] | null, FileUploadProps>;

export interface TableRowHandle {
  id: string;
  update(data: Partial<TableRow>): void;
  remove(): void;
}

export interface TableHandle extends ComponentHandle<TableProps> {
  readonly type: 'table';
  append(row: TableRow): TableRowHandle;
  prepend(row: TableRow): TableRowHandle;
  remove(rowId: string): void;
  readonly rowCount: number;
  onRowClick(handler: (row: TableRow) => void): void;
}

export interface MetricHandle extends Omit<ComponentHandle<MetricProps, string>, 'update'> {
  readonly type: 'metric';
  update(value: string, opts?: MetricOpts): void;
}

export interface ProgressHandle extends Omit<ComponentHandle<ProgressProps, number | null>, 'update'> {
  readonly type: 'progress';
  update(value: number | null, opts?: ProgressOpts): void;
}

export interface TabsHandle extends ComponentHandle<Record<string, unknown>, string> {
  readonly type: 'tabs';
  setActive(label: string): void;
}

export interface StreamHandle extends Omit<ComponentHandle<StreamTextProps, string>, 'update'> {
  readonly type: 'streamText';
  readonly text: string;
  readonly isStreaming: boolean;
  append(chunk: string): void;
  done(): void;
  clear(): void;
  update(data: Partial<StreamTextProps>): void;
}

export interface ChatHandle extends Omit<ComponentHandle<ChatUIProps, ChatMessage[]>, 'update'> {
  readonly type: 'chatUI';
  readonly lastMessage: ChatMessage | null;
  update(data: Partial<ChatUIProps>): void;
  addMessage(role: 'user' | 'assistant', content: string): void;
  clear(): void;
}

export interface PromptEditorHandle extends InputHandle<string, PromptEditorProps> {
  readonly type: 'promptEditor';
  interpolate(vars: Record<string, string>): string;
}

export type AnyComponentHandle
  = | TextHandle
    | ButtonHandle
    | TextInputHandle
    | NumberInputHandle
    | SliderHandle
    | ToggleHandle
    | SelectHandle
    | FileUploadHandle
    | TableHandle
    | MetricHandle
    | ProgressHandle
    | TabsHandle
    | StreamHandle
    | ChatHandle
    | PromptEditorHandle
    | ComponentHandle<MarkdownProps>
    | ComponentHandle<ImageProps>
    | ComponentHandle<ImageGridProps>
    | ComponentHandle<CodeProps>
    | ComponentHandle<JsonProps>
    | ComponentHandle<Record<string, unknown>, unknown>;

export interface RenderNode {
  id: string;
}

export interface ServerConnection {
  send: (message: ServerToClientMessage) => void;
  close?: () => void;
  isOpen?: () => boolean;
}

export interface LastRenderState {
  html: string;
  title: string;
  theme: ThemeMode;
}

export interface ConnectionScope {
  readonly id: string;
  readonly connection: ServerConnection;
  readonly atoms: Map<string, WritableAtom<unknown>>;
  readonly handles: Map<string, AnyComponentHandle>;
  readonly counters: Map<ComponentType, number>;
  readonly roots: RenderNode[];
  readonly outbox: ServerToClientMessage[];
  viewport: { width: number; height: number };
  theme: ThemeMode;
  uploadDir: string | null;
  lastRender: LastRenderState | null;
  getAtom<T>(key: string, initialValue: T): WritableAtom<T>;
  registerHandle(handle: AnyComponentHandle): void;
  getHandle(id: string): AnyComponentHandle | undefined;
  listHandles(): AnyComponentHandle[];
  pushNode(node: RenderNode): void;
  listRoots(): RenderNode[];
  setValue(id: string, value: unknown): void;
  send(message: ServerToClientMessage): void;
  pushFragment(handle: AnyComponentHandle): void;
  onCleanup(fn: () => void): void;
  clearTransientState(): void;
  destroy(): void;
}

export interface UIContext {
  readonly scope: ConnectionScope;
  readonly viewport: { width: number; height: number };
  readonly theme: ThemeMode;
  setTheme(mode: ThemeMode): void;
  text(content: string): TextHandle;
  markdown(content: string): void;
  image(src: string | null | undefined, opts?: Partial<ImageProps>): void;
  imageGrid(sources: Array<string | { src: string; alt?: string; caption?: string }>, opts?: Partial<ImageGridProps>): void;
  code(content: string, opts?: Partial<CodeProps>): void;
  json(data: unknown, opts?: { label?: string }): void;
  table(data: TableRow[], opts?: Partial<TableProps>): TableHandle;
  metric(label: string, value: string, opts?: MetricOpts): MetricHandle;
  progress(value: number | null, opts?: ProgressOpts): ProgressHandle;
  button(label: string, onClick: (btn: ButtonCallbackHandle) => void | Promise<void>, opts?: ButtonOpts): ButtonHandle;
  textInput(label: string, opts?: TextInputOpts): TextInputHandle;
  numberInput(label: string, opts?: NumberInputOpts): NumberInputHandle;
  slider(label: string, opts: SliderOpts): SliderHandle;
  toggle(label: string, opts?: ToggleOpts): ToggleHandle;
  select(label: string, options: SelectOption[], opts?: SelectOpts): SelectHandle;
  fileUpload(label: string, opts?: FileUploadOpts): FileUploadHandle;
  shell(regions: ShellRegions, opts?: ShellOpts): void;
  grid(areas: Array<(ctx: UIContext) => void>, opts?: GridOpts): void;
  tabs(tabs: TabDef[], opts?: TabsOpts): TabsHandle;
  card(titleOrContent: string | ((ctx: UIContext) => void), contentOrNothing?: (ctx: UIContext) => void): void;
  divider(opts?: { label?: string }): void;
  spacer(size?: number | 'sm' | 'md' | 'lg'): void;
  toast(message: string, opts?: ToastOpts): void;
  alert(message: string, opts?: AlertOpts): void;
  loading(messageOrOpts?: string | LoadingOpts, opts?: Omit<LoadingOpts, 'message'>): void;
  streamText(opts?: StreamTextOpts): StreamHandle;
  chatUI(opts?: ChatUIOptions): ChatHandle;
  promptEditor(opts?: PromptEditorOpts): PromptEditorHandle;
  onDisconnect(fn: () => void): void;
}

export interface ShellRegions {
  header?: (ctx: UIContext) => void;
  sidebar?: (ctx: UIContext) => void;
  main: (ctx: UIContext) => void;
  footer?: (ctx: UIContext) => void;
}

export interface TabDef {
  label: string;
  content: (ctx: UIContext) => void;
  disabled?: boolean;
}

export type AppCallback = (ui: UIContext) => void | Promise<void>;
export type Connection = ServerConnection;
