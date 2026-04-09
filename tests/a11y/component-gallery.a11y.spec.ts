import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { gotoAndWaitForRender } from '../helpers/server';

test.describe('phase4.5 a11y — component gallery', () => {
  test('has zero serious/critical violations on each demo page', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await gotoAndWaitForRender(page, '/');
    const pages = ['1) Intake', '2) Draft generation', '3) Review & publish'];
    for (const tab of pages) {
      const tabBtn = page.getByRole('tab', { name: tab }).first();
      await tabBtn.click();
      await expect(tabBtn).toHaveAttribute('aria-selected', 'true');
      const results = await new AxeBuilder({ page }).analyze();
      const blocking = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      expect(
        blocking,
        `Found blocking a11y violations on tab "${tab}": ${blocking.map((v) => v.id).join(', ')}`,
      ).toEqual([]);
    }
  });
});
