import { test, expect } from '@playwright/test';

async function enterWorkspace(page: import('@playwright/test').Page) {
  await page.goto('/');
  const startBtn = page.getByRole('button', { name: 'Start Analysis' });
  if (await startBtn.isVisible()) await startBtn.click();
}

test('theme toggle flips the document theme', async ({ page }) => {
  await enterWorkspace(page);
  const before = await page.evaluate(() => document.documentElement.dataset.theme);
  await page.getByRole('button', { name: /Switch to (light|dark) mode/ }).click();
  const after = await page.evaluate(() => document.documentElement.dataset.theme);
  expect(after).not.toBe(before);
});

test('help drawer opens and closes', async ({ page }) => {
  await enterWorkspace(page);
  await page.getByRole('button', { name: 'Help' }).click();
  await expect(page.locator('aside.help-drawer.open')).toBeVisible();
  await page.getByRole('button', { name: 'Close help' }).click();
});

test('settings drawer opens from a figure card', async ({ page }) => {
  await enterWorkspace(page);
  await page.getByRole('button', { name: '★ Load E. coli example' }).click();
  await page.getByRole('button', { name: 'Run ▶' }).click();
  await expect(page.locator('table')).toBeVisible({ timeout: 30000 });
  await page.getByRole('button', { name: 'Figure settings' }).first().click();
  await expect(page.locator('aside.settings-drawer.open')).toBeVisible();
  await page.getByRole('button', { name: 'Close settings' }).click();
});

test('multi-contrast mode prompts for contrasts', async ({ page }) => {
  await enterWorkspace(page);
  await page.getByRole('button', { name: 'Multi-contrast', exact: true }).click();
  await expect(page.getByText('Add a shared ontology + background and ≥2 contrasts, then Compare.')).toBeVisible();
});
