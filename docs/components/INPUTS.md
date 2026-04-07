# Input Components — Specification

> **Back to:** [MANIFEST.md](../../MANIFEST.md#41-input-components)
> **Phase:** 2 (all except multiSelect, colorPicker, dateInput which are Phase 3)

---

## Design Rules for All Input Components

1. Every input component has a `label` as its first argument. The label is always visible — it is not a placeholder.
2. Every input component has a `.value` getter backed by a Nanostores atom.
3. Every input component sends an `EVENT { event: 'change' }` message when its value changes.
4. Every input component renders a visible label + control pair, vertically stacked.
5. Every input component supports `opts.disabled: boolean` (default `false`).
6. Every input component supports `opts.helperText: string` for a small hint below the control.
7. All inputs must have an `aria-label` or `aria-labelledby` attribute.

---

## `button`

> **⚠ This component was missing from the original spec.** Added here after challenge in [QUESTIONS.md#2.2](../../QUESTIONS.md#22-the-button-component-is-absent-from-the-component-tables).

**API:**
```typescript
ui.button(label: string, onClick: () => void | Promise<void>, opts?: ButtonOpts): ButtonComponent

interface ButtonOpts {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';  // Default: 'primary'
  disabled?: boolean;
  loading?: boolean;  // Show loading spinner inside button
  icon?: string;      // Optional icon name (Phase 3 stretch)
}

interface ButtonComponent extends LastrikoComponent<void> {
  // No value — buttons are actions, not state holders
}
```

**Renders as:** `<button type="button">` styled via `.lk-btn` and variant modifier classes in `lastriko.css`.

**Behavior:**
- While `onClick` is executing (Promise in flight): button shows loading state, is disabled to prevent double-clicks.
- If `onClick` throws: engine sends `ERROR` message. Button returns to normal state.
- `variant: 'danger'` renders in red (`--lk-error` color) with a confirmation tooltip (Phase 3 stretch).

**Phase:** 2

---

## `textInput`

**API:**
```typescript
ui.textInput(label: string, opts?: TextInputOpts): TextInputComponent

interface TextInputOpts {
  placeholder?: string;
  default?: string;
  multiline?: boolean;      // Renders as <textarea> instead of <input>
  rows?: number;            // Lines for textarea (default: 3)
  maxLength?: number;
  disabled?: boolean;
  helperText?: string;
  type?: 'text' | 'email' | 'url' | 'password';  // Default: 'text'
}

interface TextInputComponent extends LastrikoComponent<string> {
  value: string;
}
```

**Renders as:**
- `multiline: false` (default) → `<input type="text">` (or email/url/password)
- `multiline: true` → `<textarea rows={opts.rows ?? 3}>`

**Events:** Sends `EVENT { event: 'change' }` on every keystroke (not on blur). This enables live reactive updates.

**Phase:** 2

---

## `numberInput`

**API:**
```typescript
ui.numberInput(label: string, opts?: NumberInputOpts): NumberInputComponent

interface NumberInputOpts {
  min?: number;
  max?: number;
  step?: number;           // Default: 1
  default?: number;
  disabled?: boolean;
  helperText?: string;
  format?: 'integer' | 'decimal' | 'currency';  // Affects display, not value
  precision?: number;      // Decimal places (default: 0 for integer, 2 for decimal)
}

interface NumberInputComponent extends LastrikoComponent<number> {
  value: number;
}
```

**Renders as:** `<input type="number">` with inline up/down buttons.

**Validation:** Values outside `[min, max]` range are clamped on blur.

**Phase:** 2

---

## `slider`

**API:**
```typescript
ui.slider(label: string, opts: SliderOpts): SliderComponent

interface SliderOpts {
  min: number;             // Required
  max: number;             // Required
  step?: number;           // Default: 1 (or 0.01 if min/max are decimals)
  default?: number;        // Default: min
  disabled?: boolean;
  helperText?: string;
  showValue?: boolean;     // Show current value display (default: true)
  marks?: number[];        // Optional tick marks at specific values
}

interface SliderComponent extends LastrikoComponent<number> {
  value: number;
}
```

**Renders as:** `<input type="range">` + current value display to the right.

**Value display:** Always shows the current value next to the slider. Format: if `step` is a decimal (e.g., 0.1), show one decimal place. If integer, show integer.

**Events:** Sends `EVENT { event: 'change' }` on every pixel of drag. The server-side debounce (16ms) prevents flooding.

**Phase:** 2

---

## `toggle`

**API:**
```typescript
ui.toggle(label: string, opts?: ToggleOpts): ToggleComponent

interface ToggleOpts {
  default?: boolean;       // Default: false
  disabled?: boolean;
  helperText?: string;
  onLabel?: string;        // Text when true (e.g., 'Enabled')
  offLabel?: string;       // Text when false (e.g., 'Disabled')
}

interface ToggleComponent extends LastrikoComponent<boolean> {
  value: boolean;
}
```

**Renders as:** `<input type="checkbox">` with CSS toggle switch styling (Lastriko CSS, not native checkbox).

**NOT a checkbox:** The toggle must visually appear as a pill-shaped switch, not a square checkbox. Styled via `.lk-toggle` in `lastriko.css`.

**Phase:** 2

---

## `select`

**API:**
```typescript
ui.select(label: string, options: SelectOption[], opts?: SelectOpts): SelectComponent

type SelectOption = string | { label: string; value: string; disabled?: boolean }

interface SelectOpts {
  default?: string;        // Default: first option
  disabled?: boolean;
  helperText?: string;
  placeholder?: string;    // First option if no default (e.g., 'Choose a model...')
}

interface SelectComponent extends LastrikoComponent<string> {
  value: string;
}
```

**Renders as:** `<select>` with `<option>` elements.

**Shorthand:** If `options` is `string[]`, each string is used as both `label` and `value`.

**Phase:** 2

---

## `fileUpload`

> **⚠ The file transport mechanism requires a decision from** [QUESTIONS.md#3.3](../../QUESTIONS.md#33-fileupload-lifecycle--what-does-the-developer-receive).

**API:**
```typescript
ui.fileUpload(label: string, opts?: FileUploadOpts): FileUploadComponent

interface FileUploadOpts {
  accept?: string;          // MIME type filter, e.g. 'image/*' or '.pdf,.docx'
  multiple?: boolean;       // Default: false
  maxSize?: number;         // Max file size in bytes (default: 10MB)
  disabled?: boolean;
  helperText?: string;
  dragDrop?: boolean;       // Show drag-drop zone (default: true)
}

interface UploadedFile {
  name: string;             // Original filename
  path: string;             // Server-side temp path
  size: number;             // Bytes
  type: string;             // MIME type
  lastModified: number;     // Timestamp
}

interface FileUploadComponent extends LastrikoComponent<UploadedFile | UploadedFile[] | null> {
  value: UploadedFile | UploadedFile[] | null;  // null if no file selected
}
```

**Renders as:** `<input type="file">` with a styled drag-and-drop zone overlay.

**File transport (pending decision):** Files are uploaded via HTTP POST `/upload`, not over WebSocket. Server writes to temp dir, responds with file metadata, client sends `EVENT` with the metadata.

**Temp file cleanup:** Files in the temp directory are deleted when the WebSocket connection closes. If a demo uses a file after disconnect (e.g., processes it in background), the developer must move it to a permanent location.

**Phase:** 2

---

## `multiSelect` (Phase 3)

**API:**
```typescript
ui.multiSelect(label: string, options: SelectOption[], opts?: MultiSelectOpts): MultiSelectComponent

interface MultiSelectOpts {
  defaults?: string[];      // Default selected values
  disabled?: boolean;
  helperText?: string;
  maxSelections?: number;   // Limit number of selectable options
}

interface MultiSelectComponent extends LastrikoComponent<string[]> {
  value: string[];
}
```

**Renders as:** Checkbox group (vertical list of labeled checkboxes). Not a multi-select `<select>` element (those have poor UX).

**Phase:** 3

---

## `colorPicker` (Phase 3)

**API:**
```typescript
ui.colorPicker(label: string, opts?: ColorPickerOpts): ColorPickerComponent

interface ColorPickerOpts {
  default?: string;         // Hex color, e.g. '#e94560'
  format?: 'hex' | 'rgb' | 'hsl';  // Default: 'hex'
  disabled?: boolean;
  helperText?: string;
  swatches?: string[];      // Preset color chips to show
}

interface ColorPickerComponent extends LastrikoComponent<string> {
  value: string;            // Always hex, regardless of format setting
}
```

**Renders as:** `<input type="color">` + hex value display + optional swatches.

**Phase:** 3

---

## `dateInput` (Phase 3)

**API:**
```typescript
ui.dateInput(label: string, opts?: DateInputOpts): DateInputComponent

interface DateInputOpts {
  default?: string;          // ISO date string: 'YYYY-MM-DD'
  min?: string;              // Earliest allowed date
  max?: string;              // Latest allowed date
  disabled?: boolean;
  helperText?: string;
  type?: 'date' | 'datetime-local' | 'time' | 'month';  // Default: 'date'
}

interface DateInputComponent extends LastrikoComponent<string> {
  value: string;             // ISO date/datetime string
}
```

**Renders as:** `<input type="date">` (or datetime-local/time/month).

**Cross-browser note:** Native date pickers vary significantly across browsers and OSes. Phase 3 uses the native input. A custom date picker is a post-1.0 consideration.

**Phase:** 3

---

## Component ID Generation

All input components generate their IDs using a position-based counter within the current execution context:

```typescript
// Pseudocode — actual implementation in packages/core/src/components/id.ts
function generateId(type: string): string {
  const position = executionContext.nextPosition();
  return `${type}-${position}`;
  // Example: 'textInput-3', 'slider-7'
}
```

**Stability:** IDs are stable as long as the component appears at the same position in the script. If the developer inserts a new component before an existing one, all subsequent IDs shift — this is a known limitation (same as React hooks). Use the `key` option to force a stable ID:

```typescript
ui.textInput('Name', { key: 'user-name-input' });
// ID: 'user-name-input' — stable regardless of position
```

---

*Related docs: [DISPLAY.md](DISPLAY.md) | [LAYOUT.md](LAYOUT.md) | [FEEDBACK.md](FEEDBACK.md) | [AI.md](AI.md)*
