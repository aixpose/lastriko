# AI-Specific Components — Specification

> **Back to:** [MANIFEST.md](../../MANIFEST.md#45-ai-specific-components)
> **Phase:** 2 (chatUI, promptEditor, streamText), 3 (modelCompare, parameterPanel, filmStrip, beforeAfter)
> Note: `streamText` is also documented in [FEEDBACK.md](FEEDBACK.md) — it bridges both categories.

---

## Design Philosophy for AI Components

AI-specific components are the differentiating feature of Lastriko versus general-purpose UI toolkits. They encode common AI demo patterns so developers don't have to re-implement them from scratch.

**Key rules:**
1. AI components are composites — they are built internally from the same primitive components available to developers.
2. AI components must work without any LLM plugin (use mocked/static data if no plugin is configured).
3. Every AI component must degrade gracefully when a plugin is missing: show a placeholder, not an error.
4. AI components do not hardcode any specific provider. Provider integration happens via plugins.

---

## `chatUI`

> **⚠ History management design requires a decision from** [QUESTIONS.md#3.4](../../QUESTIONS.md#34-chatui-history-management).

**API:**
```typescript
ui.chatUI(opts?: ChatUIOptions): ChatUIComponent

interface ChatUIOptions {
  model?: string;          // Model identifier (e.g., 'gpt-4o') — requires a compatible plugin
  provider?: string;       // Plugin name (e.g., 'openai') — auto-detected if only one LLM plugin
  systemPrompt?: string;   // Initial system message
  placeholder?: string;    // Input placeholder (default: 'Type a message...')
  maxHeight?: number;      // Max height of message list before scroll (default: 400px)
  streaming?: boolean;     // Stream responses token-by-token (default: true)
  showModelBadge?: boolean;// Show model name in responses (default: false)
  welcomeMessage?: string; // First message from assistant before any user input
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  model?: string;
  tokenCount?: number;
  latencyMs?: number;
}

interface ChatUIComponent extends ComponentHandle<ChatUIProps, Message[]> {
  value: Message[];           // Full conversation history
  lastMessage: Message | null;
  tokenCount: number;         // Cumulative tokens used
  lastResponseMs: number;     // Latency of last response
  isStreaming: boolean;
  clear(): void;              // Clear history
  addMessage(role: 'user' | 'assistant', content: string): void;  // Programmatic message
}
```

**Renders as:**
```
┌─────────────────────────────────────┐
│  [Chat message history - scrollable] │
│                                      │
│  ┌──────────────────────────────┐   │
│  │ User: Hello!                 │   │
│  └──────────────────────────────┘   │
│  ┌──────────────────────────────┐   │
│  │ Assistant: Hi there! How...  │   │
│  └──────────────────────────────┘   │
│                                      │
│  [●●● typing indicator]             │
├─────────────────────────────────────┤
│  [Text input                ] [Send]│
└─────────────────────────────────────┘
```

**Without a plugin:** Renders the chat UI interface but the send button shows "No LLM plugin configured" as a toast when clicked. The developer can still use `addMessage()` programmatically to populate it with mock data.

**History management (proposed resolution for QUESTIONS.md#3.4):**
- History is stored in a Nanostores atom scoped to the connection (NOT inside the component tree).
- The atom key is the component's stable ID.
- This means history survives re-renders (the `app()` callback re-runs, but the atom retains its value).
- History is cleared on WebSocket reconnect (page refresh).
- Hot reload preserves history (same atom ID, different execution context).

**Phase:** 2

---

## `promptEditor`

**API:**
```typescript
ui.promptEditor(opts?: PromptEditorOpts): PromptEditorComponent

interface PromptEditorOpts {
  label?: string;          // Default: 'Prompt'
  placeholder?: string;    // Default: 'Enter your prompt...'
  default?: string;        // Initial value
  variables?: string[];    // Variable names to highlight (e.g., ['topic', 'tone'])
  rows?: number;           // Default: 5
  maxLength?: number;
  showCharCount?: boolean; // Default: true
  showTokenCount?: boolean;// Estimated token count (default: false — requires tokenizer)
}

interface PromptEditorComponent extends InputHandle<string> {
  value: string;
  interpolate(vars: Record<string, string>): string;  // Replace {{variable}} with values
}
```

**Renders as:** A styled `<textarea>` with:
- Syntax-like highlighting for `{{variable}}` patterns (these are highlighted in a distinct color)
- Character count display
- Optional token count (uses a simple word-based estimation, not a true tokenizer, unless a plugin provides one)

**Variable highlighting:** When `variables: ['topic', 'tone']` is set, occurrences of `{{topic}}` and `{{tone}}` in the textarea are highlighted in the accent color. This is done via a transparent overlay technique (the textarea is transparent, a styled div behind it shows the highlighting).

**`interpolate()` method:**
```typescript
const prompt = ui.promptEditor({ 
  default: 'Write a {{tone}} essay about {{topic}}.',
  variables: ['tone', 'topic'],
});
const topic = ui.textInput('Topic', { default: 'climate change' });
const tone = ui.select('Tone', ['formal', 'casual', 'persuasive']);

ui.button('Generate', async () => {
  const finalPrompt = prompt.interpolate({ 
    topic: topic.value, 
    tone: tone.value 
  });
  // finalPrompt: 'Write a formal essay about climate change.'
});
```

**Phase:** 2

---

## `modelCompare` (Phase 3)

> **⚠ Parallel async execution model requires a decision from** [QUESTIONS.md#2.5](../../QUESTIONS.md#25-the-modelcompare-component-implies-parallel-async-execution).

**API:**
```typescript
ui.modelCompare(
  models: ModelSpec[],
  opts?: ModelCompareOpts
): ModelCompareComponent

interface ModelSpec {
  label: string;            // Display name (e.g., 'GPT-4o')
  model: string;            // Model identifier
  provider: string;         // Plugin name (e.g., 'openai')
  color?: string;           // Column accent color
}

interface ModelCompareOpts {
  prompt: string;           // The prompt to send to all models
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  streaming?: boolean;      // Default: true
}

interface ModelCompareComponent extends ComponentHandle<ModelCompareProps, ModelCompareResults> {
  value: ModelCompareResults;
  results: Record<string, string>;  // model label → response text
  isStreaming: Record<string, boolean>;
  errors: Record<string, string | null>;
  latencies: Record<string, number>;
}
```

**Renders as:** N-column layout (one column per model) using `grid()` internally:
```
┌──────────┬──────────┬──────────┐
│  GPT-4o  │ Claude   │ Llama 3  │
│──────────│──────────│──────────│
│ Streaming│ Streaming│ Streaming│
│ response │ response │ response │
│ text...  │ text...  │ text...  │
│──────────│──────────│──────────│
│ 234 tok  │ 189 tok  │ 310 tok  │
│ 1.2s     │ 0.9s     │ 2.1s     │
└──────────┴──────────┴──────────┘
```

**Concurrency:** All model calls are initiated in parallel (`Promise.all` equivalent). Each model streams independently. One model erroring does not block others.

**Phase:** 3

---

## `parameterPanel` (Phase 3)

> **⚠ Schema format requires a decision from** [QUESTIONS.md#3.5](../../QUESTIONS.md#35-parameterpanel-schema-format).

**API:**
```typescript
ui.parameterPanel(
  schema: ParameterSchema,
  opts?: ParameterPanelOpts
): ParameterPanelComponent

// Option A: Simple object schema (Lastriko-native format)
type ParameterSchema = Record<string, ParameterDef>

interface ParameterDef {
  type: 'number' | 'string' | 'boolean' | 'select';
  label?: string;
  default?: any;
  min?: number;     // For number type
  max?: number;     // For number type
  step?: number;    // For number type
  options?: string[]; // For select type
  description?: string;
}

interface ParameterPanelOpts {
  title?: string;
  collapsible?: boolean;   // Wrap in accordion (default: false)
}

interface ParameterPanelComponent extends ComponentHandle<ParameterPanelProps, Record<string, any>> {
  value: Record<string, any>;  // All parameter values by key
}
```

**Example:**
```typescript
const params = ui.parameterPanel({
  temperature: { type: 'number', label: 'Temperature', min: 0, max: 2, step: 0.1, default: 0.7 },
  maxTokens: { type: 'number', label: 'Max tokens', min: 1, max: 4096, default: 1024 },
  stream: { type: 'boolean', label: 'Streaming', default: true },
  model: { type: 'select', label: 'Model', options: ['gpt-4o', 'claude-3.5'], default: 'gpt-4o' },
});

// Access values
console.log(params.value.temperature); // 0.7
console.log(params.value.model);       // 'gpt-4o'
```

**Renders as:** A vertical stack of components auto-generated from the schema:
- `type: 'number'` with min/max/step → `slider()`
- `type: 'number'` without min/max → `numberInput()`
- `type: 'string'` → `textInput()`
- `type: 'boolean'` → `toggle()`
- `type: 'select'` → `select()`

**Phase:** 3

---

## `filmStrip` (Phase 3)

**API:**
```typescript
ui.filmStrip(
  images: Array<string | FilmStripItem>,
  opts?: FilmStripOpts
): void

interface FilmStripItem {
  src: string;
  alt?: string;
  caption?: string;
  thumbnail?: string;    // Separate thumbnail URL (if not provided, uses src)
}

interface FilmStripOpts {
  height?: number;       // Strip height in px (default: 120)
  zoom?: boolean;        // Click to zoom to full size (default: true)
  showCaptions?: boolean;// Show captions on hover (default: true)
  selectedIndex?: number;// Index of initially selected image
}
```

**Renders as:** A horizontal scrollable row of thumbnail images. On click, opens the selected image in a fullscreen overlay (or zooms in place). Keyboard navigable (left/right arrows).

**Phase:** 3

---

## `beforeAfter` (Phase 3)

**API:**
```typescript
ui.beforeAfter(
  before: string,
  after: string,
  opts?: BeforeAfterOpts
): void

interface BeforeAfterOpts {
  beforeLabel?: string;   // Default: 'Before'
  afterLabel?: string;    // Default: 'After'
  initialPosition?: number;  // 0–100, default: 50 (center)
  orientation?: 'horizontal' | 'vertical';  // Default: 'horizontal'
}
```

**Renders as:** Two images overlaid, separated by a draggable divider line. Dragging the handle reveals more of one image and less of the other.

**Implementation:** Uses CSS `clip-path` on the "after" image layer, adjusted by a draggable handle positioned via JavaScript. No canvas required.

**Touch support:** Drag handle must work on touch devices (touchmove events).

**Phase:** 3

---

## AI Component Placeholder Behavior

When an AI component requires a plugin that is not registered, it must render a helpful placeholder rather than crashing:

```
┌───────────────────────────────────────┐
│  ⚠ Plugin required                   │
│                                       │
│  This component requires:             │
│  @lastriko/plugin-openai              │
│                                       │
│  Add it to your app config:           │
│  plugins: [openai({ apiKey: '...' })] │
└───────────────────────────────────────┘
```

The placeholder is styled with `--lk-warning` colors and includes a code snippet showing exactly how to add the required plugin.

---

*Related docs: [INPUTS.md](INPUTS.md) | [DISPLAY.md](DISPLAY.md) | [LAYOUT.md](LAYOUT.md) | [FEEDBACK.md](FEEDBACK.md)*
