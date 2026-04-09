import { expect, test } from '@playwright/test';
import { artifactPath } from '../helpers/server';

test.describe('beforeAfter mobile drag', () => {
  test('supports touch/slider interaction in review page', async ({ page }, testInfo) => {
    await page.goto('/?debug=1', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.lk-shell')).toBeVisible();

    await page.getByRole('tab', { name: '3) Review & publish' }).first().click();
    const slider = page.locator('.lk-before-after .lk-before-after-range:visible').first();
    await expect(slider).toBeVisible();
    await slider.scrollIntoViewIfNeeded();

    const before = await slider.inputValue();
    await slider.evaluate((el) => {
      const input = el as HTMLInputElement;
      input.value = '74';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await expect(slider).toHaveValue('74');

    const cssPos = await page
      .locator('.lk-before-after:visible')
      .first()
      .evaluate((el) => getComputedStyle(el).getPropertyValue('--lk-before-after-pos').trim());
    expect(cssPos).toBe('74');
    expect(before).not.toBe('74');

    await page.screenshot({ path: artifactPath(testInfo, 'before-after-mobile.png'), fullPage: true });
  });
});
