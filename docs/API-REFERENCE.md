# API Reference

> **Back to:** [MANIFEST.md](../MANIFEST.md#appendix-a-full-api-quick-reference)
>
> This document covers the public API of the `lastriko` npm package. Plugin APIs are documented in their respective plugin packages.
>
> Status markers: ✅ Phase 2 | 🔷 Phase 3 | 🔌 Phase 4 (requires plugin)

---

## Core Functions

### `app()`

Start a Lastriko application.

```typescript
function app(
  title: string,
  callback: (ui: UIContext) => void | Promise<void>
): void

function app(
  title: string,
  config: AppConfig,
  callback: (ui: UIContext) => void | Promise<void>
): void

interface AppConfig {
  plugins?: LastrikoPlugin[];
  theme?: 'light' | 'dark' | 'auto';     // Default: 'auto'
  port?: number;                           // Default: 3500 (hops on EADDRINUSE)
  host?: string;                           // Default: '127.0.0.1'
  toolbar?: boolean;                       // Default: true
  openBrowser?: boolean;                   // Default: true
  favicon?: string;                        // Path to favicon file
}
```

**Example:**
```typescript
import { app } from 'lastriko';

app('My Demo', async (ui) => {
  ui.text('# Hello World');
});
```

---

### `defineConfig()`

Define a configuration file (`lastriko.config.ts`).

```typescript
function defineConfig(config: LastrikoConfig): LastrikoConfig

interface LastrikoConfig extends AppConfig {
  // Same as AppConfig — defineConfig is a typed pass-through
  upload?: {
    maxSize?: number;     // Default: 10MB
    tempDir?: string;
  };
  websocket?: {
    rateLimit?: number;   // msgs/sec, default: 100
  };
  persistence?: 'none' | 'localStorage';  // Default: 'none'
}
```

---

## UIContext Methods

The `ui` parameter in the `app()` callback. All methods below are available on `ui` and on nested `UIContext` instances inside layout components.

---

### Input Components

#### `ui.button()` ✅

```typescript
ui.button(
  label: string,
  onClick: (btn: ButtonCallbackHandle) => void | Promise<void>,
  opts?: ButtonOpts
): ButtonHandle

// btn.setLoading(true) disables the button and shows a spinner
// btn.setLoading(false) restores normal state
```
See [docs/components/INPUTS.md](components/INPUTS.md#button)

---

#### `ui.textInput()` ✅

```typescript
ui.textInput(label: string, opts?: TextInputOpts): TextInputComponent
// Returns: { value: string, id: string, ... }
```
See [docs/components/INPUTS.md](components/INPUTS.md#textinput)

---

#### `ui.numberInput()` ✅

```typescript
ui.numberInput(label: string, opts?: NumberInputOpts): NumberInputComponent
// Returns: { value: number, id: string, ... }
```

---

#### `ui.slider()` ✅

```typescript
ui.slider(label: string, opts: SliderOpts): SliderComponent
// Returns: { value: number, id: string, ... }
```

---

#### `ui.toggle()` ✅

```typescript
ui.toggle(label: string, opts?: ToggleOpts): ToggleComponent
// Returns: { value: boolean, id: string, ... }
```

---

#### `ui.select()` ✅

```typescript
ui.select(label: string, options: SelectOption[], opts?: SelectOpts): SelectComponent
// Returns: { value: string, id: string, ... }
```

---

#### `ui.fileUpload()` ✅

```typescript
ui.fileUpload(label: string, opts?: FileUploadOpts): FileUploadComponent
// Returns: { value: UploadedFile | UploadedFile[] | null, id: string, ... }
```

---

#### `ui.multiSelect()` 🔷

```typescript
ui.multiSelect(label: string, options: SelectOption[], opts?: MultiSelectOpts): MultiSelectComponent
// Returns: { value: string[], id: string, ... }
```

---

#### `ui.colorPicker()` 🔷

```typescript
ui.colorPicker(label: string, opts?: ColorPickerOpts): ColorPickerComponent
// Returns: { value: string, id: string, ... }  // value is hex color
```

---

#### `ui.dateInput()` 🔷

```typescript
ui.dateInput(label: string, opts?: DateInputOpts): DateInputComponent
// Returns: { value: string, id: string, ... }  // value is ISO date string
```

---

### Display Components

#### `ui.text()` ✅

```typescript
ui.text(content: string): TextHandle
// TextHandle.update(content: string) re-renders and pushes FRAGMENT
```

---

#### `ui.markdown()` ✅

```typescript
ui.markdown(content: string, opts?: MarkdownOpts): void
```

---

#### `ui.image()` ✅

```typescript
ui.image(src: string | null | undefined, opts?: ImageOpts): void
```

---

#### `ui.imageGrid()` ✅

```typescript
ui.imageGrid(sources: Array<string | ImageGridItem>, opts?: ImageGridOpts): void
```

---

#### `ui.code()` ✅

```typescript
ui.code(content: string, opts?: CodeOpts): void
```

---

#### `ui.json()` ✅

```typescript
ui.json(data: unknown, opts?: JsonOpts): void
```

---

#### `ui.table()` ✅

```typescript
ui.table(data: Record<string, any>[], opts?: TableOpts): TableHandle

interface TableHandle extends ComponentHandle<TableProps> {
  append(row: Record<string, any>): RowHandle
  prepend(row: Record<string, any>): RowHandle
  remove(rowId: string): void
  rowCount: number
  onRowClick(handler: (row: Record<string, any>) => void): void
}

interface RowHandle {
  id: string
  update(data: Partial<Record<string, any>>): void
  remove(): void
}
```

---

#### `ui.metric()` ✅

```typescript
ui.metric(label: string, value: string, opts?: MetricOpts): MetricHandle
// MetricHandle.update(value: string, opts?: MetricOpts) re-renders and pushes FRAGMENT
// value is always string — convert numbers: String(count)
```

---

#### `ui.progress()` ✅

```typescript
ui.progress(value: number | null, opts?: ProgressOpts): ProgressComponent
```

---

#### `ui.video()` 🔷

```typescript
ui.video(src: string, opts?: VideoOpts): void
```

---

#### `ui.audio()` 🔷

```typescript
ui.audio(src: string, opts?: AudioOpts): void
```

---

#### `ui.diff()` 🔷

```typescript
ui.diff(before: string, after: string, opts?: DiffOpts): void
```

---

### Layout Components

> Full spec: [docs/components/LAYOUT.md](components/LAYOUT.md)

#### `ui.shell()` ✅

Defines the page structure. Only declared regions render.

```typescript
ui.shell(regions: ShellRegions, opts?: ShellOpts): ShellHandle

interface ShellRegions {
  header?:  (ctx: UIContext) => void
  sidebar?: (ctx: UIContext) => void
  main:     (ctx: UIContext) => void   // required
  footer?:  (ctx: UIContext) => void
}

interface ShellOpts {
  sidebarPosition?: 'left' | 'right'  // Default: 'left'
  sidebarWidth?:    string             // Default: '260px'
  stickyHeader?:    boolean            // Default: true
  stickyFooter?:    boolean            // Default: false
}
```

---

#### `ui.grid()` ✅

Splits any region into rows and columns.

```typescript
ui.grid(areas: Array<(ctx: UIContext) => void>, opts?: GridOpts): void

interface GridOpts {
  cols?:     number | string[]   // Default: areas.length (equal columns)
  rows?:     number | string[]   // Default: 1 row
  gap?:      number              // px. Default: 16
  minWidth?: number              // px for auto-fit. Default: 200
}
```

---

#### `ui.tabs()` ✅

Content switcher within a region.

```typescript
ui.tabs(tabs: TabDef[], opts?: TabsOpts): TabsComponent

interface TabDef {
  label:     string
  content:   (ctx: UIContext) => void
  disabled?: boolean
}
```

---

#### `ui.card()` ✅

```typescript
ui.card(title: string, content: (card: UIContext) => void): void
ui.card(content: (card: UIContext) => void): void
```

---

#### `ui.divider()` ✅

```typescript
ui.divider(opts?: { label?: string, spacing?: 'sm' | 'md' | 'lg' }): void
```

---

#### `ui.spacer()` ✅

```typescript
ui.spacer(size?: number | 'sm' | 'md' | 'lg'): void
```

---

#### `ui.accordion()` 🔷

```typescript
ui.accordion(sections: AccordionDef[], opts?: AccordionOpts): AccordionComponent
```

---

#### `ui.fullscreen()` 🔷

```typescript
ui.fullscreen(content: (ctx: UIContext) => void, opts?: FullscreenOpts): FullscreenComponent
```

---

### Feedback Components

#### `ui.toast()` ✅

```typescript
ui.toast(message: string, opts?: ToastOpts): void
```

---

#### `ui.alert()` ✅

```typescript
ui.alert(message: string, opts?: AlertOpts): void
```

---

#### `ui.loading()` ✅

```typescript
ui.loading(opts?: LoadingOpts): void
ui.loading(message: string, opts?: Omit<LoadingOpts, 'message'>): void
```

---

#### `ui.streamText()` ✅

```typescript
ui.streamText(opts?: StreamTextOpts): StreamHandle

interface StreamHandle extends ComponentHandle<StreamTextProps> {
  append(chunk: string): void   // Sends STREAM_CHUNK to client
  done(): void                  // Hides cursor, marks stream complete
  clear(): void                 // Reset content
  text: string                  // Accumulated text so far
  isStreaming: boolean
}
```

---

### AI Components

#### `ui.chatUI()` ✅

```typescript
ui.chatUI(opts?: ChatUIOptions): ChatUIComponent
```
See [docs/components/AI.md](components/AI.md#chatui)

---

#### `ui.promptEditor()` ✅

```typescript
ui.promptEditor(opts?: PromptEditorOpts): PromptEditorComponent
```

---

#### `ui.modelCompare()` 🔷

```typescript
ui.modelCompare(models: ModelSpec[], opts?: ModelCompareOpts): ModelCompareComponent
```

---

#### `ui.parameterPanel()` 🔷

```typescript
ui.parameterPanel(schema: ParameterSchema, opts?: ParameterPanelOpts): ParameterPanelComponent
```

---

#### `ui.filmStrip()` 🔷

```typescript
ui.filmStrip(images: Array<string | FilmStripItem>, opts?: FilmStripOpts): void
```

---

#### `ui.beforeAfter()` 🔷

```typescript
ui.beforeAfter(before: string, after: string, opts?: BeforeAfterOpts): void
```

---

### UIContext Utilities

#### `ui.setTheme()` ✅

```typescript
ui.setTheme(mode: 'light' | 'dark' | 'auto'): void
```

---

#### `ui.navigate()` 🔷

```typescript
ui.navigate(page: string): void
```

---

#### `ui.page()` 🔷

```typescript
ui.page(name: string, content: (page: UIContext) => void): void
```

---

#### `ui.viewport` ✅

```typescript
// Read-only property
ui.viewport: { width: number, height: number }
```

---

#### `ui.theme` ✅

```typescript
// Read-only property
ui.theme: 'light' | 'dark'
```

---

## Type Exports

```typescript
import type {
  ComponentHandle,        // Base handle type
  InputHandle,            // Input component handles
  ButtonHandle,
  TableHandle, TableRow, RowHandle,
  TextHandle, MetricHandle, ProgressHandle, StreamHandle,
  LastrikoPlugin,         // Plugin interface
  PluginContext,          // Plugin setup context
  UIContext,              // The 'ui' object type
  AppConfig,              // app() configuration
  LastrikoConfig,         // defineConfig() configuration
  
  // Component option types
  ButtonOpts, TextInputOpts, SliderOpts, ToggleOpts,
  SelectOpts, FileUploadOpts, MultiSelectOpts, ColorPickerOpts, DateInputOpts,
  ImageOpts, ImageGridOpts, CodeOpts, JsonOpts, TableOpts,
  MetricOpts, ProgressOpts, VideoOpts, AudioOpts, DiffOpts,
  ShellRegions, ShellOpts, GridOpts, TabDef, TabsOpts, CardOpts, DividerOpts,
  AccordionDef, AccordionOpts, FullscreenOpts,
  ToastOpts, AlertOpts, LoadingOpts, StreamTextOpts,
  ChatUIOptions, PromptEditorOpts, ModelSpec, ModelCompareOpts,
  ParameterSchema, ParameterPanelOpts, FilmStripOpts, BeforeAfterOpts,
  
  // Component return types
  ButtonComponent, TextInputComponent, NumberInputComponent, SliderComponent,
  ToggleComponent, SelectComponent, FileUploadComponent, MultiSelectComponent,
  ColorPickerComponent, DateInputComponent,
  ProgressComponent, StreamTextComponent,
  TabsComponent, AccordionComponent, FullscreenComponent,
  ChatUIComponent, PromptEditorComponent, ModelCompareComponent, ParameterPanelComponent,
  
  // Other types
  Message,               // Chat message
  UploadedFile,          // File upload result
  SelectOption,          // Select/multiSelect option
} from 'lastriko';
```

---

*For full component documentation, see the component spec docs in [docs/components/](components/).*
