import { expect, test } from '@playwright/test';

test('ページにアクセスすると、ルートノードが表示されていること', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('button', { name: 'ルート（中心概念）' })).toBeVisible();
});

test('ルートノードを選択してTabキーを押すと、新しいノードが追加されること', async ({ page }) => {
  await page.goto('/');

  const rootNode = page.getByRole('button', { name: 'ルート（中心概念）' });

  await rootNode.click();
  await rootNode.press('Tab');

  await expect(page.getByPlaceholder('ラベルを入力')).toBeVisible();
});
