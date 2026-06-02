import { test, expect } from '@playwright/test';

const MINI_GMT = 'T1\tterm one\tg1\tg2\tg3\tg4\nT2\tterm two\tg3\tg4\tg5\tg6\nT3\tterm three\tg5\tg6\tg7\tg8';
const MINI_BG = Array.from({ length: 20 }, (_, i) => `g${i + 1}`).join('\n');
const MINI_TARGET = ['g1', 'g2', 'g3', 'g4', 'g5'].join('\n');

async function enterWorkspace(page: import('@playwright/test').Page) {
  await page.goto('/');
  const startBtn = page.getByRole('button', { name: 'Start Analysis' });
  if (await startBtn.isVisible()) await startBtn.click();
}

async function fillMini(page: import('@playwright/test').Page) {
  await enterWorkspace(page);
  const tas = page.locator('textarea');
  await tas.nth(0).fill(MINI_GMT);
  await tas.nth(1).fill(MINI_TARGET);
  await tas.nth(2).fill(MINI_BG);
}

test('resampling shows steps/seed and a convergence diagnostics panel', async ({ page }) => {
  await enterWorkspace(page);
  await page.getByRole('button', { name: '★ Load E. coli example' }).click();
  await page.getByRole('button', { name: 'Run ▶' }).click();
  await expect(page.locator('table')).toBeVisible({ timeout: 30000 });
  await page.getByRole('button', { name: 'Resampling', exact: true }).click();
  await expect(page.getByRole('spinbutton').first()).toBeVisible();
  const diag = page.getByRole('note', { name: 'Resampling eFDR diagnostics' });
  await expect(diag).toBeVisible({ timeout: 60000 });
  await expect(diag).toContainText('max |ΔeFDR|');
});

test('resampling result is shareable and replays exactly', async ({ page, context }) => {
  await fillMini(page);
  await page.getByRole('button', { name: 'Run ▶' }).click();
  await expect(page.locator('table')).toBeVisible({ timeout: 30000 });
  await page.getByRole('button', { name: 'Resampling', exact: true }).click();
  await expect(page.getByRole('note', { name: 'Resampling eFDR diagnostics' })).toBeVisible({ timeout: 60000 });
  await page.getByRole('button', { name: '🔗 Share link' }).click();
  const url = await page.locator('.share-url').inputValue();
  expect(url).toContain('#c=');
  const replay = await context.newPage();
  await replay.goto(url);
  await expect(replay.getByText('✓ Reproduced exactly (matches the shared fingerprint)')).toBeVisible({ timeout: 60000 });
});

test('Report and TSV record the resampling provenance', async ({ page }) => {
  await fillMini(page);
  await page.getByRole('button', { name: 'Run ▶' }).click();
  await expect(page.locator('table')).toBeVisible({ timeout: 30000 });
  await page.getByRole('button', { name: 'Resampling', exact: true }).click();
  await expect(page.getByRole('note', { name: 'Resampling eFDR diagnostics' })).toBeVisible({ timeout: 60000 });
  await page.getByRole('button', { name: '⎙ Report' }).click();
  await expect(page.getByText(/resampling \(steps = \d+, seed = 42\)/)).toBeVisible();
  await page.getByRole('button', { name: '← Back' }).click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: '⤓ TSV' }).click(),
  ]);
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const ch of stream) chunks.push(ch as Buffer);
  const text = Buffer.concat(chunks).toString('utf8');
  expect(text).toContain('# efdrMode=resampling');
});

test('editing steps without re-running still shares the displayed result exactly', async ({ page, context }) => {
  await fillMini(page);
  await page.getByRole('button', { name: 'Run ▶' }).click();
  await expect(page.locator('table')).toBeVisible({ timeout: 30000 });
  await page.getByRole('button', { name: 'Resampling', exact: true }).click();
  await expect(page.getByRole('note', { name: 'Resampling eFDR diagnostics' })).toBeVisible({ timeout: 60000 });
  // Change steps WITHOUT pressing Run again — the displayed result is still the 100000-step run.
  const stepsInput = page.getByRole('spinbutton').first();
  await stepsInput.fill('5000');
  // Share now: the capsule must encode the DISPLAYED run's steps (100000), not 5000.
  await page.getByRole('button', { name: '🔗 Share link' }).click();
  const url = await page.locator('.share-url').inputValue();
  expect(url).toContain('#c=');
  const replay = await context.newPage();
  await replay.goto(url);
  await expect(replay.getByText('✓ Reproduced exactly (matches the shared fingerprint)')).toBeVisible({ timeout: 60000 });
});
