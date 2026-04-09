import { expect, test } from '@playwright/test';
import { artifactPath, gotoAndWaitForRender } from '../helpers/server';

test.describe('component-gallery 3-page flow', () => {
  test('renders all 3 pages with visible content', async ({ page }, testInfo) => {
    await gotoAndWaitForRender(page, '/?debug=1');

    await expect(page.getByRole('tab', { name: '1) Intake' })).toBeVisible();
    await expect(page.getByRole('tab', { name: '2) Draft generation' })).toBeVisible();
    await expect(page.getByRole('tab', { name: '3) Review & publish' })).toBeVisible();
    await expect(page.getByText('Goal: capture a marketing brief').first()).toBeVisible();
    await page.screenshot({ path: artifactPath(testInfo, 'component-gallery-intake.png'), fullPage: true });

    await page.getByRole('tab', { name: '2) Draft generation' }).click();
    await expect(page.getByRole('tab', { name: '2) Draft generation' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('button', { name: 'Run draft generation' }).first()).toBeVisible();
    await page.screenshot({ path: artifactPath(testInfo, 'component-gallery-draft-generation.png'), fullPage: true });

    await page.getByRole('tab', { name: '3) Review & publish' }).click();
    await expect(page.getByRole('tab', { name: '3) Review & publish' })).toHaveAttribute('aria-selected', 'true');
    await expect(
      page.getByText('Goal: compare model outputs, tune params, and approve a final draft.').first(),
    ).toBeVisible();
    await page.screenshot({ path: artifactPath(testInfo, 'component-gallery-review-publish.png'), fullPage: true });
  });
});
