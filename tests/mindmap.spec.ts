import { expect, test } from '@playwright/test';

test.describe('マインドマップのUIテスト', () => {
  test('ページにアクセスすると、ルートノードが表示されていること', async ({ page }) => {
    // Arrange: アプリを開く。
    await page.goto('/');

    // Assert: ルートノードが見えることを確認する。
    await expect(page.getByRole('button', { name: 'ルート（中心概念）' })).toBeVisible();
  });

  test('Enterキーで選択中の子ノードから兄弟ノードを追加できること', async ({ page }) => {
    // Arrange: ルートから子ノードを作って編集状態にする。
    await page.goto('/');
    const rootNode = page.getByRole('button', { name: 'ルート（中心概念）' });
    await rootNode.click();
    await rootNode.press('Tab');

    // Act: 子ノードの編集入力で Enter を押す。
    const editingInput = page.getByPlaceholder('ラベルを入力');
    await editingInput.press('Enter');

    // Assert: 兄弟ノードが追加され、編集入力も引き継がれる。
    await expect(page.getByRole('button', { name: '無題' })).toBeVisible();
    await expect(page.getByPlaceholder('ラベルを入力')).toBeVisible();
  });

  test('Delete/Backspace で選択中ノードを削除でき、ルートは削除されないこと', async ({ page }) => {
    // Arrange: ルートだけの状態で Delete を試す。
    await page.goto('/');
    const rootNode = page.getByRole('button', { name: 'ルート（中心概念）' });
    await rootNode.click();
    await rootNode.press('Delete');

    // Assert: ルートノードは残る。
    await expect(rootNode).toBeVisible();

    // Arrange: 空ラベルの新規ノードを作る。
    await rootNode.press('Tab');
    const editingInput = page.getByPlaceholder('ラベルを入力');

    // Act: 空ラベルのまま Backspace を押して削除する。
    await editingInput.press('Backspace');

    // Assert: 追加直後のノードが消え、ルートだけが残る。
    await expect(page.getByPlaceholder('ラベルを入力')).toHaveCount(0);
    await expect(rootNode).toBeVisible();
  });

  test('文字キーで選択中ノードを即座に編集モードへ切り替えられること', async ({ page }) => {
    // Arrange: ルートノードを選択する。
    await page.goto('/');
    const rootNode = page.getByRole('button', { name: 'ルート（中心概念）' });
    await rootNode.click();

    // Act: 文字キーを押す。
    await rootNode.press('A');

    // Assert: input に切り替わる。
    await expect(page.getByPlaceholder('ラベルを入力')).toBeVisible();
  });

  test('矢印キーで隣接ノードへフォーカスを移動できること', async ({ page }) => {
    // Arrange: root の子を2つ作って、root を再選択する。
    await page.goto('/');
    const rootNode = page.getByRole('button', { name: 'ルート（中心概念）' });
    await rootNode.click();
    await rootNode.press('Tab');

    const firstChildInput = page.getByPlaceholder('ラベルを入力');
    await firstChildInput.press('Enter');

    // root をクリックし直して、矢印キーの起点を root に戻す。
    await rootNode.click();

    // Act: 右矢印で子ノードへ移動する。
    await rootNode.press('ArrowRight');

    // Assert: selected クラスが root から子ノードへ移る。
    await expect(page.locator('.mindmap-node--selected')).toHaveCount(1);
    await expect(page.locator('.mindmap-node--selected')).toContainText('無題');
    await expect(page.locator('.mindmap-node--selected')).not.toContainText('ルート（中心概念）');
  });
});
