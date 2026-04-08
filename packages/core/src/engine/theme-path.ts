import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

/**
 * Resolve `lastriko.css` for `GET /style.css`.
 *
 * Resolution order:
 * 1. `LASTRIKO_THEME_CSS` — absolute or cwd-relative path (must exist).
 * 2. `packages/core/src/theme/lastriko.css` under `process.cwd()` (monorepo dev from repo root).
 * 3. `../theme/lastriko.css` next to this module (`src/engine` or `dist/engine` after build).
 *
 * Returns `null` if no readable file is found (caller should respond with 500, not throw).
 */
export function resolveThemeCssPath(cwd: string): string | null {
  const fromEnv = process.env.LASTRIKO_THEME_CSS?.trim();
  if (fromEnv) {
    const abs = fromEnv.startsWith('/')
      ? fromEnv
      : join(cwd, fromEnv);
    return existsSync(abs) ? abs : null;
  }

  const monorepoDev = join(cwd, 'packages/core/src/theme/lastriko.css');
  if (existsSync(monorepoDev))
    return monorepoDev;

  const here = dirname(fileURLToPath(import.meta.url));
  const nextToEngine = join(here, '../theme/lastriko.css');
  if (existsSync(nextToEngine))
    return nextToEngine;

  return null;
}
