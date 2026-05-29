import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Load inputs (or the example) and press Run.')).toBeVisible();
});

test('runs the E. coli example and shows results', async ({ page }) => {
  await page.getByRole('button', { name: '★ Load E. coli example' }).click();
  await page.getByRole('button', { name: 'Run ▶' }).click();
  await expect(page.locator('table')).toBeVisible({ timeout: 30000 });
  await expect(page.locator('.summary-pill')).toContainText('significant terms');
});

test('switching correction method re-runs and keeps results', async ({ page }) => {
  await page.getByRole('button', { name: '★ Load E. coli example' }).click();
  await page.getByRole('button', { name: 'Run ▶' }).click();
  await expect(page.locator('table')).toBeVisible({ timeout: 30000 });
  await page.getByRole('button', { name: 'BH', exact: true }).click();
  await expect(page.locator('.summary-pill')).toContainText('BH < 0.05');
  await page.getByRole('button', { name: 'Bonferroni', exact: true }).click();
  await expect(page.locator('.summary-pill')).toContainText('bonferroni < 0.05');
});
