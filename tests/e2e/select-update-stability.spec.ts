import { expect, test } from '@playwright/test';
import { gotoAndWaitForRender } from '../helpers/server';

test.describe('select update stability', () => {
  test('review selector sync does not trigger render crash', async ({ page }) => {
    test.setTimeout(120_000);
    await gotoAndWaitForRender(page, '/?debug=1');
    await expect(page.locator('.lk-shell')).toBeVisible();

    await page.locator('.lk-tab[data-lk-tab-target="2) Draft generation"]').first().click();
    await page.getByRole('button', { name: 'Run draft generation' }).first().click();
    await expect(page.getByText(/queued|completed\./i)).toBeVisible({ timeout: 20_000 });
    await page.locator('.lk-shell-main').first().evaluate((el) => {
      el.scrollTo({ top: el.scrollHeight, behavior: 'instant' });
    });
    await page.waitForTimeout(100);

    await page.locator('.lk-tab[data-lk-tab-target="3) Review & publish"]').first().click();
    await expect(page.getByRole('tab', { name: '3) Review & publish' }).first()).toHaveAttribute('aria-selected', 'true');
    const syncBtn = page.getByRole('button', { name: 'Sync selected run to review' }).first();
    await expect(syncBtn).toBeVisible();
    await syncBtn.evaluate((btn) => (btn as HTMLButtonElement).click());

    await expect(page.locator('#lk-error-overlay')).toHaveCount(0);
    await expect(page.getByText(/Selected run-|Choose a run/i)).toBeVisible();
  });
});
