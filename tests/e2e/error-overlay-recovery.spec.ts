import { expect, test } from '@playwright/test';
import { editFile } from '../helpers/server';
import type { Page } from '@playwright/test';

const BLOCK = `m.markdown(
          '## Purposeful demo\\nThis gallery models a **content workflow**: 1) Intake, 2) Draft generation, 3) Review & publish.',
        );`;
const BROKEN = `${BLOCK}
        throw new Error('phase45-e2e-overlay');`;

async function waitForOverlay(page: Page): Promise<void> {
  for (let i = 0; i < 20; i += 1) {
    try {
      await page.reload({ waitUntil: 'domcontentloaded' });
    } catch {
      await page.waitForTimeout(400);
      continue;
    }
    const overlay = page.locator('#lk-error-overlay');
    if (await overlay.count() > 0) {
      return;
    }
    await page.waitForTimeout(350);
  }
  throw new Error('error overlay did not appear after forced reload loop');
}

test.describe('error overlay rendering/recovery', () => {
  test('shows overlay on broken render and recovers after restore', async ({ page }, testInfo) => {
    await page.goto('/?debug=1', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.lk-shell')).toBeVisible();
    const file = '/workspace/examples/component-gallery/demo.ts';
    try {
      editFile(file, (source) => source.replace(BLOCK, BROKEN));
      await waitForOverlay(page);
      await expect(page.locator('#lk-error-overlay')).toBeVisible({ timeout: 10_000 });
      await expect(page.locator('#lk-error-overlay')).toContainText('phase45-e2e-overlay');
      await page.screenshot({ path: testInfo.outputPath('error-overlay-visible.png'), fullPage: true });

      editFile(file, (source) => source.replace(BROKEN, BLOCK));
      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(page.locator('#lk-error-overlay')).toHaveCount(0, { timeout: 20_000 });
      await expect(page.locator('.lk-shell')).toBeVisible();
      await page.screenshot({ path: testInfo.outputPath('error-overlay-recovered.png'), fullPage: true });
    } finally {
      editFile(file, (source) => source.replace(BROKEN, BLOCK));
    }
  });
});
