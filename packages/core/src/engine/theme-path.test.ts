import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { resolveThemeCssPath } from './theme-path';

describe('resolveThemeCssPath', () => {
  const prevEnv = process.env.LASTRIKO_THEME_CSS;

  afterEach(() => {
    if (prevEnv === undefined)
      delete process.env.LASTRIKO_THEME_CSS;
    else
      process.env.LASTRIKO_THEME_CSS = prevEnv;
  });

  it('returns monorepo dev path when cwd is repo root and packages/core tree exists', () => {
    const cwd = join(__dirname, '../../../../');
    const p = resolveThemeCssPath(cwd);
    expect(p).not.toBeNull();
    expect(p).toContain('packages/core/src/theme/lastriko.css');
    expect(readFileSync(p!, 'utf8')).toContain(':root');
  });

  it('uses LASTRIKO_THEME_CSS when set to an existing absolute path', () => {
    const dir = mkdtempSync(join(tmpdir(), 'lk-theme-'));
    const custom = join(dir, 'custom.css');
    writeFileSync(custom, 'body{}');
    process.env.LASTRIKO_THEME_CSS = custom;
    expect(resolveThemeCssPath('/')).toBe(custom);
    rmSync(dir, { recursive: true, force: true });
  });

  it('returns null when LASTRIKO_THEME_CSS points to a missing file', () => {
    process.env.LASTRIKO_THEME_CSS = join(tmpdir(), 'nonexistent-lastriko-theme.css');
    expect(resolveThemeCssPath(process.cwd())).toBeNull();
  });

  it('resolves next to engine module when monorepo layout is absent', () => {
    const isolated = mkdtempSync(join(tmpdir(), 'lk-cwd-'));
    const p = resolveThemeCssPath(isolated);
    expect(p).not.toBeNull();
    expect(readFileSync(p!, 'utf8')).toContain(':root');
    rmSync(isolated, { recursive: true, force: true });
  });

  it('prefers LASTRIKO_THEME_CSS over monorepo path when both exist', () => {
    const dir = mkdtempSync(join(tmpdir(), 'lk-pref-'));
    const fakeRoot = join(dir, 'repo');
    mkdirSync(join(fakeRoot, 'packages/core/src/theme'), { recursive: true });
    writeFileSync(join(fakeRoot, 'packages/core/src/theme/lastriko.css'), '/* mono */');
    const custom = join(dir, 'winner.css');
    writeFileSync(custom, '/* winner */');
    process.env.LASTRIKO_THEME_CSS = custom;
    expect(resolveThemeCssPath(fakeRoot)).toBe(custom);
    rmSync(dir, { recursive: true, force: true });
  });
});
