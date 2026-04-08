import { createServer as createHttpServer } from 'node:http';
import { dirname, join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { resolveThemeCssPath } from './theme-path';
import { __internal, startServer } from './server';

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
    });
    await withHttpHandler(handler, async (base) => {
      const res = await fetch(`${base}/client/nope.js`);
      expect(res.status).toBe(404);
    });
  });
});
