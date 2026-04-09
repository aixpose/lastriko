import { expect, test } from '@playwright/test';
import { artifactPath, gotoAndWaitForRender, editFile } from '../helpers/server';
import { readFile, writeFile } from 'node:fs/promises';

test('hot reload preserves input, tab, and scroll state', async ({ page }, testInfo) => {
  await gotoAndWaitForRender(page, '/?debug=1');

  await page.getByRole('tab', { name: '1) Intake' }).click();
  const notes = page.getByRole('textbox', { name: 'Notes template' }).first();
  await notes.fill('Draft for {{audience}} with {{style}} tone. [hot-reload-check]');

  await page.getByRole('tab', { name: '2) Draft generation' }).click();
  await expect(page.getByRole('tab', { name: '2) Draft generation' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText('Draft assistant ready. Run a generation to append outputs.')).toBeVisible();

  await page.evaluate(() => window.scrollTo({ top: 700, behavior: 'instant' }));
  const beforeScroll = await page.evaluate(() => window.scrollY);
  expect(beforeScroll).toBeGreaterThan(100);

  const file = '/workspace/examples/component-gallery/demo.ts';
  const marker = '// __phase45_hot_reload_marker__';
  const original = await readFile(file, 'utf8');

  try {
    await writeFile(file, `${original}\n${marker}\n`, 'utf8');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('.lk-shell')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('tab', { name: '2) Draft generation' })).toHaveAttribute('aria-selected', 'true', {
      timeout: 20_000,
    });
    await page.getByRole('tab', { name: '1) Intake' }).click();
    await expect(page.locator('[data-lk-tab-panel="1) Intake"] [data-lk-kind="promptEditor"]')).toHaveValue(
      'Draft for {{audience}} with {{style}} tone. [hot-reload-check]',
    );
    const afterScroll = await page.evaluate(() => window.scrollY);
    expect(afterScroll).toBeGreaterThan(100);
    await expect(page.locator('#lk-error-overlay')).toHaveCount(0);
    await page.screenshot({ path: artifactPath(testInfo, 'hot-reload-preserved.png'), fullPage: true });
  } finally {
    await writeFile(file, original, 'utf8');
  }
});
