import { createServer as createHttpServer } from 'node:http';
import { describe, expect, it } from 'vitest';
import { startServer } from './server';

describe('startServer port selection', () => {
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
