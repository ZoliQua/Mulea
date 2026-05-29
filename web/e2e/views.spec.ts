import { test, expect } from '@playwright/test';

async function runExample(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByRole('button', { name: '★ Load E. coli example' }).click();
  await page.getByRole('button', { name: 'Run ▶' }).click();
  await expect(page.locator('table')).toBeVisible({ timeout: 30000 });
}

const SVG_VIEWS: { tab: string; aria: string }[] = [
  { tab: 'Lollipop', aria: 'Lollipop of significant terms' },
  { tab: 'Barplot', aria: 'Barplot of significant terms' },
  { tab: 'Network', aria: 'Network of significant terms' },
  { tab: 'Heatmap', aria: 'Heatmap of terms by hit genes' },
  { tab: 'Venn Diagram', aria: 'Venn diagram of significant terms by correction method' },
  { tab: 'UpSet', aria: 'UpSet plot of significant terms by correction method' },
];

for (const v of SVG_VIEWS) {
  test(`view "${v.tab}" renders its SVG`, async ({ page }) => {
    await runExample(page);
    await page.getByRole('button', { name: v.tab, exact: true }).click();
    await expect(page.getByRole('img', { name: v.aria })).toBeVisible();
  });
}

test('dashboard layout shows all figure cards at once', async ({ page }) => {
  await runExample(page);
  await page.getByRole('button', { name: 'Dashboard', exact: true }).click();
  await expect(page.getByRole('img', { name: 'Lollipop of significant terms' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Heatmap of terms by hit genes' })).toBeVisible();
});

test('clicking a lollipop term opens the drilldown panel', async ({ page }) => {
  await runExample(page);
  await page.getByRole('button', { name: 'Lollipop', exact: true }).click();
  const svg = page.getByRole('img', { name: 'Lollipop of significant terms' });
  await svg.locator('circle').first().click();
  await expect(page.getByRole('button', { name: 'Close details' })).toBeVisible();
});
