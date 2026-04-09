import { expect, test } from '@playwright/test';
import { artifactPath, gotoAndWaitForRender } from '../helpers/server';

test.describe('component-gallery runtime visibility', () => {
  test('renders shell + tablist + active panel by default', async ({ page }, testInfo) => {
    await gotoAndWaitForRender(page, '/?debug=1');
    await expect(page.locator('.lk-shell')).toBeVisible();
    await expect(page.locator('.lk-tabs [role="tablist"]')).toBeVisible();
    await expect(page.locator('.lk-tab-panel:not([hidden])')).toHaveCount(1);
    await expect(page.getByRole('tab', { name: '1) Intake' })).toHaveAttribute('aria-selected', 'true');
    await page.screenshot({ path: artifactPath(testInfo, 'gallery-default-visible.png'), fullPage: true });
  });

  test('each page tab exposes visible goal content', async ({ page }, testInfo) => {
    await gotoAndWaitForRender(page, '/?debug=1');

    await page.getByRole('tab', { name: '1) Intake' }).click();
    await expect(page.getByRole('tab', { name: '1) Intake' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByText('Goal: capture a marketing brief').first()).toBeVisible();

    await page.getByRole('tab', { name: '2) Draft generation' }).click();
    await expect(page.getByRole('tab', { name: '2) Draft generation' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('button', { name: 'Run draft generation' }).first()).toBeVisible();

    await page.getByRole('tab', { name: '3) Review & publish' }).click();
    await expect(page.getByRole('tab', { name: '3) Review & publish' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('button', { name: 'Run model comparison for selected run' }).first()).toBeVisible();
    await expect(page.locator('.lk-before-after').first()).toBeVisible();
    await page.screenshot({ path: artifactPath(testInfo, 'gallery-tabs-visible-content.png'), fullPage: true });
  });
});
