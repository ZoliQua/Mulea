import { test, expect } from '@playwright/test';

async function enterWorkspace(page: import('@playwright/test').Page) {
  await page.goto('/');
  const startBtn = page.getByRole('button', { name: 'Start Analysis' });
  if (await startBtn.isVisible()) await startBtn.click();
}

async function runExample(page: import('@playwright/test').Page) {
  await enterWorkspace(page);
  await page.getByRole('button', { name: '★ Load E. coli example' }).click();
  await page.getByRole('button', { name: 'Run ▶' }).click();
  await expect(page.locator('table')).toBeVisible({ timeout: 30000 });
}

test('TSV export triggers a download', async ({ page }) => {
  await runExample(page);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: '⤓ TSV' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/\.tsv$/);
});

test('Report view opens and returns', async ({ page }) => {
  await runExample(page);
  await page.getByRole('button', { name: '⎙ Report' }).click();
  await expect(page.getByRole('button', { name: '← Back' })).toBeVisible();
});

// Tiny synthetic GMT/target/background so the capsule fits in a URL (<8000 chars encoded).
const MINI_GMT = [
  'TF_A\tTF-Alpha\tgeneA1\tgeneA2\tgeneA3\tgeneA4\tgeneA5',
  'TF_B\tTF-Beta\tgeneB1\tgeneB2\tgeneB3\tgeneB4\tgeneB5',
  'TF_C\tTF-Gamma\tgeneC1\tgeneC2\tgeneC3\tgeneC4\tgeneC5',
].join('\n');

const MINI_TARGET = ['geneA1', 'geneA2', 'geneA3', 'geneA4'].join('\n');

const MINI_BG = [
  'geneA1','geneA2','geneA3','geneA4','geneA5',
  'geneB1','geneB2','geneB3','geneB4','geneB5',
  'geneC1','geneC2','geneC3','geneC4','geneC5',
  'geneX1','geneX2','geneX3','geneX4','geneX5',
].join('\n');

test('capsule share writes a #c= URL that replays identically', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await enterWorkspace(page);

  // Fill in minimal inputs via the textareas so the capsule fits in a URL.
  const textareas = page.locator('textarea');
  await textareas.nth(0).fill(MINI_GMT);
  await textareas.nth(1).fill(MINI_TARGET);
  await textareas.nth(2).fill(MINI_BG);

  await page.getByRole('button', { name: 'Run ▶' }).click();
  await expect(page.locator('table')).toBeVisible({ timeout: 30000 });

  // Share button must now be enabled (small inputs).
  await expect(page.getByRole('button', { name: '🔗 Share link' })).toBeEnabled();
  await page.getByRole('button', { name: '🔗 Share link' }).click();

  // Read the URL from the .share-url input (clipboard on the same origin is reliable,
  // but the hash-only navigation from page.goto would not re-initialize React state;
  // reading from the visible input is simpler and always works).
  const url = await page.locator('.share-url').inputValue();
  expect(url).toContain('#c=');

  // Open the capsule URL in a fresh page so React initializes from scratch with the hash.
  const replayPage = await context.newPage();
  await replayPage.goto(url);
  await expect(replayPage.locator('table')).toBeVisible({ timeout: 30000 });
  await expect(replayPage.getByText('✓ Reproduced exactly (matches the shared fingerprint)')).toBeVisible();
  await replayPage.close();
});
