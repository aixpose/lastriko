import { expect, test } from '@playwright/test';
import { artifactPath, gotoAndWaitForRender, withServer } from '../helpers/server';

test.describe('image-viewer example', () => {
  test('table row activates matching folder tab; Phase 1-only filter hides completed P1 folder', async ({
    page,
  }, testInfo) => {
    await withServer({ demoScript: 'examples/image-viewer/demo.ts' }, async ({ url }) => {
      await gotoAndWaitForRender(page, `${url}/`);

      await expect(page.getByRole('tab', { name: 'Gartenweg 4 Grundrisse' })).toHaveAttribute(
        'aria-selected',
        'true',
      );
      await expect(page.getByText('Gartenweg 4 Grundrisse').first()).toBeVisible();
      await expect(page.getByText('Phase 1', { exact: true }).first()).toBeVisible();
      const activePanel = page.locator('.lk-shell-main .lk-tab-panel:not([hidden])');
      const statsCard = activePanel.locator('.lk-card').filter({ hasText: 'Stats' }).first();
      const phase1Value = statsCard.locator('.lk-metric').first().locator('.lk-metric-value');
      await expect(phase1Value).toContainText('50%');
      await expect(phase1Value).toContainText('1 / 2');

      await page
        .locator('.lk-shell-sidebar tr[data-lk-table-row-id]')
        .filter({ hasText: 'Rosenstraße' })
        .click();
      await expect(page.getByRole('tab', { name: 'Rosenstraße 12-14 1G...' })).toHaveAttribute(
        'aria-selected',
        'true',
      );
      await expect(page.getByText('Rosenstraße 12-14 1G...').first()).toBeVisible();
      const phase1AfterRow = activePanel.locator('.lk-card').filter({ hasText: 'Stats' }).first().locator('.lk-metric').first().locator('.lk-metric-value');
      await expect(phase1AfterRow).toContainText('100%');
      await expect(phase1AfterRow).toContainText('1 / 1');

      const sidebar = page.locator('.lk-shell-sidebar');
      // Click the visible switch label (native checkbox is off-screen in the custom toggle).
      await sidebar.locator('.lk-field--toggle', { hasText: 'Phase 2' }).locator('.lk-toggle-wrap').click();
      await sidebar.locator('.lk-field--toggle', { hasText: 'Phase 3' }).locator('.lk-toggle-wrap').click();
      await page.getByRole('button', { name: 'Apply filters' }).click();

      await expect(
        page.locator('.lk-shell-sidebar tr[data-lk-table-row-id]').filter({ hasText: 'Rosenstraße' }),
      ).toHaveCount(0);
      await expect(
        page.locator('.lk-shell-sidebar tr[data-lk-table-row-id]').filter({ hasText: 'Gartenweg' }),
      ).toHaveCount(1);

      await page.screenshot({ path: artifactPath(testInfo, 'image-viewer-filtered.png'), fullPage: true });
    });
  });
});
