import { expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { startExampleServer } from '../helpers/server';

interface PerfResult {
  scenario: string;
  metric: string;
  value: number;
  unit: string;
  target: string;
  pass: boolean;
  environment: {
    os: NodeJS.Platform;
    arch: string;
    node: string;
    browser: string;
    url: string;
  };
}

function writeBenchmarkArtifact(fileName: string, payload: PerfResult): void {
  const outDir = join(process.cwd(), 'artifacts', 'benchmarks');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, fileName), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

test.describe('phase 4.5 benchmarks', () => {
  test('10k-row table initial viewport render target', async ({ page, browserName }) => {
    const server = await startExampleServer('bench-table-10k');
    try {
      await page.goto(`${server.url}/`, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('.lk-table-wrap[data-lk-virtualized="true"]')).toBeVisible();

      const value = await page.evaluate(() => {
        return document.querySelectorAll('.lk-table-wrap tbody tr[data-lk-table-row-id]').length;
      });
      const pass = value > 0 && value < 350;

      writeBenchmarkArtifact('table-10k.json', {
        scenario: 'table-10k-viewport',
        metric: 'visible_rows_in_initial_viewport',
        value,
        unit: 'rows',
        target: '>0 and <350 rows rendered in viewport',
        pass,
        environment: {
          os: process.platform,
          arch: process.arch,
          node: process.version,
          browser: browserName,
          url: server.url,
        },
      });

      expect(pass).toBe(true);
    } finally {
      await server.stop();
    }
  });

  test('rapid slider event batching target', async ({ page, browserName }) => {
    const server = await startExampleServer('component-gallery');
    try {
      await page.goto(`${server.url}/?debug=1`, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('.lk-shell')).toBeVisible();

      const wsLog: string[] = [];
      page.on('console', (msg) => {
        const text = msg.text();
        if (text.includes('[lastriko] ←')) {
          wsLog.push(text);
        }
      });

      const slider = page.getByRole('slider', { name: 'Temperature' });
      await slider.focus();
      await page.keyboard.press('Home');
      for (let i = 0; i < 20; i += 1) {
        await page.keyboard.press('ArrowRight');
      }
      await page.waitForTimeout(500);

      const batchCount = wsLog.filter((line) => line.includes('BATCH')).length;
      const fragmentCount = wsLog.filter((line) => line.includes('FRAGMENT')).length;
      const value = batchCount;
      const pass = batchCount > 0;

      writeBenchmarkArtifact('slider-batching.json', {
        scenario: 'slider-batching',
        metric: 'batch_messages_observed',
        value,
        unit: 'count',
        target: '>0 BATCH messages during rapid slider updates',
        pass,
        environment: {
          os: process.platform,
          arch: process.arch,
          node: process.version,
          browser: `${browserName} (fragments=${fragmentCount})`,
          url: server.url,
        },
      });

      expect(pass).toBe(true);
    } finally {
      await server.stop();
    }
  });

  test('lazy image loading first-paint target', async ({ page, browserName }) => {
    const server = await startExampleServer('component-gallery');
    try {
      await page.goto(server.url, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('.lk-shell')).toBeVisible();

      const value = await page.evaluate(() => {
        const paints = performance.getEntriesByType('paint');
        return paints.find((entry) => entry.name === 'first-contentful-paint')?.startTime ?? Number.NaN;
      });

      const rounded = Number.isFinite(value) ? Math.round(value) : -1;
      const pass = Number.isFinite(value) && value <= 2000;
      writeBenchmarkArtifact('lazy-image-first-paint.json', {
        scenario: 'lazy-image-first-paint',
        metric: 'first_contentful_paint',
        value: rounded,
        unit: 'ms',
        target: '<=2000ms',
        pass,
        environment: {
          os: process.platform,
          arch: process.arch,
          node: process.version,
          browser: browserName,
          url: server.url,
        },
      });

      expect(pass).toBe(true);
    } finally {
      await server.stop();
    }
  });
});
