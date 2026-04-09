import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import type { Page, TestInfo } from '@playwright/test';

const WORKSPACE_ROOT = '/workspace';
const READY_RE = /\[lastriko\] Ready at (https?:\/\/[^\s]+)/;

export function artifactPath(testInfo: TestInfo, name: string): string {
  return testInfo.outputPath(name);
}

export function workspacePath(relativePath: string): string {
  return resolve(WORKSPACE_ROOT, relativePath);
}

export async function startExampleServer(exampleDir: string): Promise<{
  url: string;
  stdout: string[];
  stderr: string[];
  stop(): Promise<void>;
}> {
  return startProcessServer({
    cwd: workspacePath(`examples/${exampleDir}`),
    command: 'npm run dev:once',
  });
}

export async function withServer(
  opts: { demoScript: string; command?: string },
  run: (ctx: { url: string; resolvePath: (rel: string) => string }) => Promise<void>,
): Promise<void> {
  const demoDir = opts.demoScript.split('/').slice(0, -1).join('/');
  const absDemoDir = workspacePath(demoDir);
  const server = await startProcessServer({
    cwd: absDemoDir,
    command: opts.command ?? 'npm run dev:once',
  });
  try {
    await run({
      url: server.url,
      resolvePath: (rel: string) => workspacePath(`${demoDir}/${rel}`),
    });
  } finally {
    await server.stop();
  }
}

export async function gotoAndWaitForRender(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.lk-shell', { timeout: 20_000 });
}

export async function gotoReadyAndCapture(
  page: Page,
  testInfo: TestInfo,
  url: string,
  screenshotName: string,
): Promise<void> {
  await gotoAndWaitForRender(page, url);
  await page.screenshot({ path: artifactPath(testInfo, `${screenshotName}.png`), fullPage: true });
}

export function editFile(path: string, edit: (input: string) => string): void {
  const source = readFileSync(path, 'utf8');
  const next = edit(source);
  writeFileSync(path, next, 'utf8');
}

export function readFileText(path: string): string {
  return readFileSync(path, 'utf8');
}

async function startProcessServer(opts: {
  cwd: string;
  command: string;
  timeoutMs?: number;
}): Promise<{
  url: string;
  stdout: string[];
  stderr: string[];
  stop(): Promise<void>;
}> {
  const child = spawn(opts.command, {
    cwd: opts.cwd,
    env: { ...process.env, FORCE_COLOR: '0' },
    shell: true,
    stdio: 'pipe',
  }) as ChildProcessWithoutNullStreams;
  const stdout: string[] = [];
  const stderr: string[] = [];
  child.stdout.on('data', (chunk: Buffer | string) => stdout.push(String(chunk)));
  child.stderr.on('data', (chunk: Buffer | string) => stderr.push(String(chunk)));
  const timeoutMs = opts.timeoutMs ?? 120_000;
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const output = `${stdout.join('')}\n${stderr.join('')}`;
    const readyUrl = READY_RE.exec(output)?.[1];
    if (readyUrl) {
      return {
        url: readyUrl,
        stdout,
        stderr,
        async stop() {
          if (child.exitCode !== null) {
            return;
          }
          child.kill('SIGTERM');
          await Promise.race([
            new Promise<void>((resolveDone) => child.once('exit', () => resolveDone())),
            sleep(3_000),
          ]);
          if (child.exitCode === null) {
            child.kill('SIGKILL');
          }
        },
      };
    }
    await sleep(100);
  }
  if (child.exitCode === null) {
    child.kill('SIGKILL');
  }
  throw new Error(`Timed out waiting for server READY log.\n${stdout.join('')}\n${stderr.join('')}`);
}
