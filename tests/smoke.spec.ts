import { expect, test } from '@playwright/test';

test('アプリが起動し、基本的なノード操作ができる', async ({ page }) => {
  // アプリを開く
  await page.goto('/');

  // React + ReactFlow + Store の結合確認: ルートノードが表示されている
  await expect(page.getByRole('button', { name: 'ルート（中心概念）' })).toBeVisible();

  // キーボードショートカット + Store + ReactFlow の結合確認:
  // Tab キーで子ノードを追加
  await page.getByRole('button', { name: 'ルート（中心概念）' }).press('Tab');

  // インライン編集用の入力欄が表示される
  await expect(page.getByPlaceholder('ラベルを入力')).toBeVisible();
});
