import { expect, test } from '@playwright/test';
import { artifactPath, gotoAndWaitForRender, workspacePath } from '../helpers/server';
import { readFile, writeFile } from 'node:fs/promises';

test('hot reload preserves input, tab, and scroll state', async ({ page }, testInfo) => {
  await gotoAndWaitForRender(page, '/?debug=1');

  const campaignDate = page.locator('input[type="date"][aria-label="Campaign date"]').first();
  await expect(campaignDate).toBeVisible();
  await campaignDate.fill('2026-04-21');

  await page.getByRole('tab', { name: '2) Draft generation' }).click();
  await expect(page.getByRole('tab', { name: '2) Draft generation' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText('Draft assistant ready. Run a generation to append outputs.').first()).toBeVisible();

  await page.evaluate(() => window.scrollTo({ top: 700, behavior: 'instant' }));
  const beforeScroll = await page.evaluate(() => window.scrollY);
  expect(beforeScroll).toBeGreaterThan(100);

  const file = workspacePath('examples/component-gallery/demo.ts');
  const marker = '// __phase45_hot_reload_marker__';
  const original = await readFile(file, 'utf8');

  try {
    await writeFile(file, `${original}\n${marker}\n`, 'utf8');
    // Let the dev server hot-reload cycle happen naturally so snapshot capture/restore runs.
    await page.waitForTimeout(1_200);
    await expect(page.locator('.lk-shell')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('tab', { name: '2) Draft generation' })).toHaveAttribute('aria-selected', 'true', {
      timeout: 20_000,
    });
    await expect(campaignDate).toHaveValue('2026-04-21');
    const afterScroll = await page.evaluate(() => window.scrollY);
    expect(afterScroll).toBeGreaterThan(100);
    await expect(page.locator('#lk-error-overlay')).toHaveCount(0);
    await page.screenshot({ path: artifactPath(testInfo, 'hot-reload-preserved.png'), fullPage: true });
  } finally {
    await writeFile(file, original, 'utf8');
  }
});
