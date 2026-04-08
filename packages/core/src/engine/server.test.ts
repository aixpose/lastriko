import { existsSync, rmSync } from 'node:fs';
import { createServer as createHttpServer } from 'node:http';
import { dirname, join } from 'node:path';
import process from 'node:process';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { resolveThemeCssPath } from './theme-path';
import { __internal, startServer } from './server';

const uploadDirRoot = '/tmp/lastriko-upload-tests';

async function withHttpHandler(
  handler: ReturnType<typeof __internal.createHttpHandler>,
  fn: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const srv = createHttpServer(handler);
  await new Promise<void>((resolve, reject) => {
    srv.once('error', reject);
    srv.listen(0, '127.0.0.1', () => resolve());
  });
  const addr = srv.address();
  const port = typeof addr === 'object' && addr ? addr.port : null;
  if (port == null) {
    await new Promise<void>((r, j) => srv.close((e) => (e ? j(e) : r())));
    throw new Error('Could not bind test server');
  }
  const baseUrl = `http://127.0.0.1:${port}`;
  try {
    await fn(baseUrl);
  }
  finally {
    await new Promise<void>((resolve, reject) => {
      srv.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

describe('startServer port selection', () => {
  it('defaults to port 3500 or hops when it is occupied', async () => {
    const app = await startServer(
      { title: 'default-port', callback: () => {} },
      { host: '127.0.0.1' },
    );
    try {
      expect(app.port).toBeGreaterThanOrEqual(3500);
      expect(app.port).toBeLessThanOrEqual(3563);
    }
    finally {
      await app.stop();
    }
  });

  it('uses the next port when the requested one is in use', async () => {
    const blocker = createHttpServer();
    await new Promise<void>((resolve, reject) => {
      blocker.once('error', reject);
      blocker.listen(0, '127.0.0.1', () => resolve());
    });
    const addr = blocker.address();
    const blocked = typeof addr === 'object' && addr ? addr.port : null;
    expect(blocked).not.toBeNull();

    const app = await startServer(
      { title: 'hop-test', callback: () => {} },
      { port: blocked!, host: '127.0.0.1' },
    );

    expect(app.port).toBe(blocked! + 1);

    await app.stop();
    await new Promise<void>((resolve, reject) => {
      blocker.close((err) => (err ? reject(err) : resolve()));
    });
  });
});

describe('http handler resilience', () => {
  const thisDir = dirname(fileURLToPath(import.meta.url));
  const clientRoot = join(thisDir, '../../dist/client');

  it('responds 500 for /style.css when theme file is missing without throwing', async () => {
    const handler = __internal.createHttpHandler({
      title: 't',
      toolbar: false,
      getTheme: () => 'light',
      themeCssPath: null,
      clientRootPath: null,
      uploadDirRoot,
    });
    await withHttpHandler(handler, async (base) => {
      const res = await fetch(`${base}/style.css`);
      expect(res.status).toBe(500);
      const text = await res.text();
      expect(text).toContain('theme CSS');
    });
  });

  it('serves /style.css when theme path is valid', async () => {
    const cssPath = resolveThemeCssPath(process.cwd());
    expect(cssPath).not.toBeNull();
    const handler = __internal.createHttpHandler({
      title: 't',
      toolbar: false,
      getTheme: () => 'light',
      themeCssPath: cssPath,
      clientRootPath: null,
      uploadDirRoot,
    });
    await withHttpHandler(handler, async (base) => {
      const res = await fetch(`${base}/style.css`);
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toContain(':root');
    });
  });

  it('serves built /client/index.js from resolved client root', async () => {
    const handler = __internal.createHttpHandler({
      title: 't',
      toolbar: false,
      getTheme: () => 'light',
      themeCssPath: resolveThemeCssPath(process.cwd()),
      clientRootPath: clientRoot,
      uploadDirRoot,
    });
    await withHttpHandler(handler, async (base) => {
      const res = await fetch(`${base}/client/index.js`);
      expect(res.status).toBe(200);
      const js = await res.text();
      expect(js).toContain('createWSManager');
    });
  });

  it('returns 404 for missing client module', async () => {
    const handler = __internal.createHttpHandler({
      title: 't',
      toolbar: false,
      getTheme: () => 'light',
      themeCssPath: resolveThemeCssPath(process.cwd()),
      clientRootPath: clientRoot,
      uploadDirRoot,
    });
    await withHttpHandler(handler, async (base) => {
      const res = await fetch(`${base}/client/nope.js`);
      expect(res.status).toBe(404);
    });
  });

  it('accepts multipart upload and returns uploaded file metadata', async () => {
    const handler = __internal.createHttpHandler({
      title: 't',
      toolbar: false,
      getTheme: () => 'light',
      themeCssPath: resolveThemeCssPath(process.cwd()),
      clientRootPath: clientRoot,
      uploadDirRoot: join(tmpdir(), 'lastriko-upload-test'),
    });

    await withHttpHandler(handler, async (base) => {
      const form = new FormData();
      form.append('file', new Blob(['hello world'], { type: 'text/plain' }), 'hello.txt');
      const res = await fetch(`${base}/upload?connectionId=scope-test`, { method: 'POST', body: form });
      expect(res.status).toBe(200);
      const payload = await res.json() as { name: string; path: string; size: number; type: string };
      expect(payload.name).toBe('hello.txt');
      expect(payload.path).toContain('scope-test');
      expect(payload.size).toBeGreaterThan(0);
      expect(payload.type).toContain('text/plain');
    });
  });

  it('rejects uploads above default 10MB limit', async () => {
    const handler = __internal.createHttpHandler({
      title: 't',
      toolbar: false,
      getTheme: () => 'light',
      themeCssPath: resolveThemeCssPath(process.cwd()),
      clientRootPath: clientRoot,
      uploadDirRoot: join(tmpdir(), 'lastriko-upload-test'),
    });

    await withHttpHandler(handler, async (base) => {
      const boundary = '----lastriko-test-boundary';
      const overLimit = 10 * 1024 * 1024 + 1;
      const fileBody = 'a'.repeat(overLimit);
      const multipart = `--${boundary}\r\n`
        + 'Content-Disposition: form-data; name="file"; filename="big.txt"\r\n'
        + 'Content-Type: text/plain\r\n\r\n'
        + `${fileBody}\r\n`
        + `--${boundary}--\r\n`;
      const res = await fetch(`${base}/upload?connectionId=scope-test`, {
        method: 'POST',
        headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
        body: multipart,
      });
      expect(res.status).toBe(413);
      const payload = await res.json() as { error: string };
      expect(payload.error).toContain('File too large');
    });
  });

  it('enforces per-component upload max size from header', async () => {
    const handler = __internal.createHttpHandler({
      title: 't',
      toolbar: false,
      getTheme: () => 'light',
      themeCssPath: resolveThemeCssPath(process.cwd()),
      clientRootPath: clientRoot,
      uploadDirRoot: join(tmpdir(), 'lastriko-upload-test'),
    });

    await withHttpHandler(handler, async (base) => {
      const boundary = '----lastriko-small-limit';
      const oversizedBody = 'a'.repeat(2 * 1024);
      const multipart = `--${boundary}\r\n`
        + 'Content-Disposition: form-data; name="file"; filename="small.txt"\r\n'
        + 'Content-Type: text/plain\r\n\r\n'
        + `${oversizedBody}\r\n`
        + `--${boundary}--\r\n`;
      const res = await fetch(`${base}/upload?connectionId=scope-test`, {
        method: 'POST',
        headers: {
          'content-type': `multipart/form-data; boundary=${boundary}`,
          'x-lastriko-upload-max-size': '1024',
        },
        body: multipart,
      });
      expect(res.status).toBe(413);
      const payload = await res.json() as { error: string };
      expect(payload.error).toContain('File too large');
    });
  });

  it('maps uploaded connection directory into websocket scope and cleans it on disconnect', async () => {
    const tempRoot = join(tmpdir(), `lastriko-upload-life-${Date.now()}`);
    const app = await startServer(
      {
        title: 'upload-lifecycle',
        callback: (ui) => {
          ui.text('ok');
        },
      },
      { host: '127.0.0.1', port: 0 },
    );

    try {
      const scopeId = 'scope-lifecycle-test';
      const uploadDir = join(tmpdir(), 'lastriko-uploads', scopeId);
      rmSync(uploadDir, { recursive: true, force: true });
      const form = new FormData();
      form.append('file', new Blob(['hello'], { type: 'text/plain' }), 'hello.txt');
      const uploadRes = await fetch(
        `http://${app.host}:${app.port}/upload?connectionId=${scopeId}`,
        { method: 'POST', body: form },
      );
      expect(uploadRes.status).toBe(200);
      expect(existsSync(uploadDir)).toBe(true);

      const { WebSocket } = await import('ws');
      const ws = new WebSocket(`ws://${app.host}:${app.port}/ws`);
      const ready = await new Promise<boolean>((resolve) => {
        let sentReady = false;
        ws.on('message', (raw) => {
          const message = JSON.parse(String(raw)) as { type: string; payload?: any };
          if (message.type === 'TOAST' && typeof message.payload?.message === 'string' && message.payload.message.startsWith('__connection_id__:') && !sentReady) {
            sentReady = true;
            ws.send(JSON.stringify({
              type: 'READY',
              payload: { viewport: { width: 100, height: 100 }, theme: null },
            }));
            resolve(true);
          }
        });
      });
      expect(ready).toBe(true);
      ws.close();
      await new Promise((resolve) => ws.once('close', resolve));
    } finally {
      await app.stop();
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
