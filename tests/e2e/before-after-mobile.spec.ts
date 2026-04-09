import { expect, test } from '@playwright/test';
import { artifactPath } from '../helpers/server';

test.describe('beforeAfter mobile drag', () => {
  test('supports touch/slider interaction in review page', async ({ page }, testInfo) => {
    await page.goto('/?debug=1', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.lk-shell')).toBeVisible();

    await page.getByRole('tab', { name: '3) Review & publish' }).click();
    const reviewPanel = page.locator('.lk-tab-panel[data-lk-tab-panel="3) Review & publish"]:not([hidden])').first();
    const slider = reviewPanel.locator('.lk-before-after .lk-before-after-range').first();
    await expect(slider).toBeVisible();

    const before = await slider.inputValue();
    await slider.fill('74');
    await expect(slider).toHaveValue('74');

    const cssPos = await reviewPanel
      .locator('.lk-before-after')
      .first()
      .evaluate((el) => getComputedStyle(el).getPropertyValue('--lk-before-after-pos').trim());
    expect(cssPos).toBe('74');
    expect(before).not.toBe('74');

    await page.screenshot({ path: artifactPath(testInfo, 'before-after-mobile.png'), fullPage: true });
  });
});
