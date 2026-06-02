import { test, expect } from '@playwright/test';

async function enterWorkspace(page: import('@playwright/test').Page) {
  await page.goto('/');
  const startBtn = page.getByRole('button', { name: 'Start Analysis' });
  if (await startBtn.isVisible()) await startBtn.click();
}

async function runEcoliResampling(page: import('@playwright/test').Page) {
  await enterWorkspace(page);
  await page.getByRole('button', { name: '★ Load E. coli example' }).click();
  await page.getByRole('button', { name: 'Run ▶' }).click();
  await expect(page.locator('table')).toBeVisible({ timeout: 30000 });
  await page.getByRole('button', { name: 'Resampling', exact: true }).click();
  await expect(page.getByRole('note', { name: 'Resampling eFDR diagnostics' })).toBeVisible({ timeout: 60000 });
}

test('per-term QC download contains the QC header and columns', async ({ page }) => {
  await runEcoliResampling(page);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: '↓ per-term QC' }).click(),
  ]);
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const ch of stream) chunks.push(ch as Buffer);
  const text = Buffer.concat(chunks).toString('utf8');
  expect(text).toContain('# muleaLab — eFDR QC (MC vs exact analytic)');
  expect(text).toContain('eFDR_mc\teFDR_exact\tabs_delta');
});

test('dice button changes the seed value', async ({ page }) => {
  await enterWorkspace(page);
  await page.getByRole('button', { name: '★ Load E. coli example' }).click();
  await page.getByRole('button', { name: 'Run ▶' }).click();
  await expect(page.locator('table')).toBeVisible({ timeout: 30000 });
  await page.getByRole('button', { name: 'Resampling', exact: true }).click();
  const seedInput = page.getByRole('spinbutton').nth(1); // 0 = steps, 1 = seed
  const before = await seedInput.inputValue();
  await page.getByRole('button', { name: 'Randomize seed' }).click();
  await expect(seedInput).not.toHaveValue(before);
});

test('soft warning appears for very large steps and clears when reduced', async ({ page }) => {
  await enterWorkspace(page);
  await page.getByRole('button', { name: '★ Load E. coli example' }).click();
  await page.getByRole('button', { name: 'Run ▶' }).click();
  await expect(page.locator('table')).toBeVisible({ timeout: 30000 });
  await page.getByRole('button', { name: 'Resampling', exact: true }).click();
  const stepsInput = page.getByRole('spinbutton').first();
  await stepsInput.fill('2000000');
  await expect(page.getByText('⚠ large — may take a while')).toBeVisible();
  await stepsInput.fill('100000');
  await expect(page.getByText('⚠ large — may take a while')).toHaveCount(0);
});

test('multi-contrast resampling shows per-contrast diagnostics', async ({ page }) => {
  await enterWorkspace(page);
  await page.getByRole('button', { name: 'Multi-contrast', exact: true }).click();
  await page.getByRole('button', { name: 'Resampling', exact: true }).click();
  await page.getByRole('button', { name: '★ Load example (2 contrasts)' }).click();
  await page.getByRole('button', { name: 'Compare ▶' }).click();
  const note = page.getByRole('note', { name: 'Resampling diagnostics (per contrast)' });
  await expect(note).toBeVisible({ timeout: 90000 });
  await expect(note).toContainText('max |ΔeFDR|');
});
