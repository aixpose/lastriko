import process from 'node:process';
import type { LastrikoPlugin } from './plugins/types';
import { createServer, type RuntimeConfig, type RunningServer } from './engine/server';
import type { AppCallback } from './components/types';

export interface AppConfig extends RuntimeConfig {
  plugins?: LastrikoPlugin[];
  toolbar?: boolean;
  hotReloadPreserve?: boolean;
}

export interface AppOptions {
  plugins?: LastrikoPlugin[];
  server?: RuntimeConfig;
  hotReloadPreserve?: boolean;
}

export interface RunningApp {
  stop: () => Promise<void>;
  server: RunningServer;
}

export function defineConfig(config: AppConfig): AppConfig {
  return config;
}

export async function app(title: string, callback: AppCallback, opts: AppOptions = {}): Promise<RunningApp> {
  const plugins = opts.plugins as unknown as import('./plugins/registry').PluginRegistry | undefined;
  const server = await createServer({
    title,
    plugins,
    app: callback,
    ...(opts.server ?? {}),
    hotReloadPreserve: opts.hotReloadPreserve ?? true,
  });
  if (process.env.NODE_ENV !== 'test') {
    console.info(`[lastriko] Ready at http://${server.host}:${server.port}`);
  }

  return {
    server,
    stop: async () => {
      await server.stop();
    },
  };
}

export type {
  ConnectionScope as Connection,
  ComponentHandle,
  ButtonHandle,
  ButtonCallbackHandle,
  InputHandle,
  TextHandle,
  TextInputHandle,
  NumberInputHandle,
  SliderHandle,
  ToggleHandle,
  SelectHandle,
  MultiSelectHandle,
  ColorPickerHandle,
  DateInputHandle,
  FileUploadHandle,
  UploadedFile,
  SelectOption,
  ButtonOpts,
  TextInputOpts,
  NumberInputOpts,
  SliderOpts,
  ToggleOpts,
  SelectOpts,
  MultiSelectOpts,
  ColorPickerOpts,
  DateInputOpts,
  FileUploadOpts,
  VideoProps,
  AudioProps,
  DiffProps,
  AccordionSection,
  AccordionOpts,
  FullscreenHandle,
  FullscreenOpts,
  TableHandle,
  TableRow,
  TableRowHandle as RowHandle,
  MetricHandle,
  MetricOpts,
  ProgressHandle,
  ProgressOpts,
  StreamHandle,
  StreamTextOpts,
  ChatHandle,
  ChatUIOptions,
  PromptEditorHandle,
  PromptEditorOpts,
  ModelSpec,
  ModelCompareOpts,
  ModelCompareResults,
  ModelCompareHandle,
  ParameterDef,
  ParameterSchema,
  ParameterPanelOpts,
  ParameterPanelHandle,
  FilmStripItem,
  FilmStripOpts,
  BeforeAfterOpts,
  ShellRegions,
  ShellOpts,
  GridOpts,
  TabsOpts,
  TabsHandle,
  TabDef,
  ToastOpts,
  AlertOpts,
  LoadingOpts,
  UIContext,
  AppCallback,
} from './components/types';
export type { LastrikoPlugin } from './plugins/types';
export { createWebSocketHub } from './engine/websocket';
export { createWatcher, startWatcher } from './engine/watcher';
