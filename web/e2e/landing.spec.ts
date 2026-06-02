import { test, expect } from '@playwright/test';

test('landing shows first; Start enters the tool; Home returns', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Start Analysis' })).toBeVisible();
  await expect(page.getByText('Multi-ontology enrichment')).toBeVisible();
  await page.getByRole('button', { name: 'Start Analysis' }).click();
  await expect(page.getByText('Correction', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Home' }).click();
  await expect(page.getByRole('button', { name: 'Start Analysis' })).toBeVisible();
});

test('a #c= capsule link opens the tool directly (skips the landing)', async ({ page }) => {
  await page.goto('/#c=deadbeef');
  await expect(page.getByRole('button', { name: 'Start Analysis' })).toHaveCount(0);
  await expect(page.getByText('Correction', { exact: true })).toBeVisible();
});

test('dark is the default theme', async ({ page }) => {
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark');
});
