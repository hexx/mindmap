import { expect, test } from '@playwright/test';

test.describe('マインドマップのUIテスト', () => {
  test('ページにアクセスすると、ルートノードが表示されていること', async ({ page }) => {
    // Arrange: アプリを開く。
    await page.goto('/');

    // Assert: ルートノードが表示されていることを確認する。
    await expect(page.getByRole('button', { name: 'ルート（中心概念）' })).toBeVisible();
  });

  test('新規作成後にルートノードへフォーカスが当たること', async ({ page }) => {
    // Arrange: アプリを開いてメニューから新規作成を実行できる状態にする。
    await page.goto('/');
    const menuButton = page.getByRole('button', { name: 'アクションメニュー' });
    const rootNode = page.getByRole('button', { name: 'ルート（中心概念）' });

    await menuButton.click();
    page.once('dialog', async (dialog) => {
      await dialog.accept();
    });

    // Act: メニューの新規作成を実行する。
    await page.getByRole('button', { name: '新規作成' }).click();

    // Assert: ルートノードにフォーカスが戻る。
    await expect(rootNode).toBeFocused();
  });

  test('メニューを開くと6つのアクションが縦並びで表示されること', async ({ page }) => {
    // Arrange: アプリを開いてメニューを開く。
    await page.goto('/');
    const menuButton = page.getByRole('button', { name: 'アクションメニュー' });

    // Act: メニューを開く。
    await menuButton.click();

    const dropdown = page.locator('.main-menu__dropdown');

    // Assert: 6つのアクションが縦並びで表示される。
    await expect(dropdown).toBeVisible();
    await expect(dropdown).toHaveCSS('flex-direction', 'column');
    await expect(page.locator('.main-menu__item')).toHaveCount(6);
    await expect(page.locator('.main-menu__item').first()).toHaveCSS('justify-content', 'flex-start');
  });

  test('メニュー外クリックで閉じること', async ({ page }) => {
    // Arrange: アプリを開いてメニューを開く。
    await page.goto('/');
    const menuButton = page.getByRole('button', { name: 'アクションメニュー' });
    await menuButton.click();

    // Act: メニュー外の透明オーバーレイをクリックする。
    await page.locator('.main-menu__overlay').click();

    // Assert: メニューが閉じる。
    await expect(page.locator('.main-menu__dropdown')).toHaveCount(0);
  });

  test('ルートノードをダブルクリックすると編集モードに切り替わること', async ({ page }) => {
    // Arrange: アプリを開いてルートノードにアクセスする。
    await page.goto('/');
    const rootNode = page.getByRole('button', { name: 'ルート（中心概念）' });

    // Act: ルートノードをダブルクリックする。
    await rootNode.dblclick();

    // Assert: インライン編集の input が表示される。
    await expect(page.getByPlaceholder('ラベルを入力')).toBeVisible();
  });

  test('選択中のノードでSpaceキーを押すと編集モードに切り替わること', async ({ page }) => {
    // Arrange: ルートノードを選択する。
    await page.goto('/');
    const rootNode = page.getByRole('button', { name: 'ルート（中心概念）' });
    await rootNode.click();

    // Act: Space キーを押す。
    await rootNode.press('Space');

    // Assert: インライン編集の input が表示される。
    await expect(page.getByPlaceholder('ラベルを入力')).toBeVisible();
  });

  test('モバイルツールバーから子ノードを追加でき、不要な操作は無効化されること', async ({ page }) => {
    // Arrange: モバイル表示にしてアプリを開く。
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    const toolbar = page.locator('.mobile-toolbar');
    const addChildButton = toolbar.getByRole('button', { name: '子ノード追加' });
    const addSiblingButton = toolbar.getByRole('button', { name: '兄弟ノード追加' });
    const deleteButton = toolbar.getByRole('button', { name: '削除' });
    const rootNode = page.getByRole('button', { name: 'ルート（中心概念）' });

    // Assert: モバイルツールバーが表示され、ルート選択中は一部ボタンが無効になっている。
    await expect(toolbar).toBeVisible();
    await expect(addChildButton).toBeEnabled();
    await expect(addSiblingButton).toBeDisabled();
    await expect(deleteButton).toBeDisabled();

    // Act: ルートノードを選択して、子ノード追加をタップする。
    await rootNode.click();
    await addChildButton.click();

    // Assert: 新しいノードが追加され、編集 input が表示される。
    await expect(page.getByPlaceholder('ラベルを入力')).toBeVisible();
  });

  test('Enterキーで選択中の子ノードから兄弟ノードを追加できること', async ({ page }) => {
    // Arrange: ルートから子ノードを作って編集状態にする。
    await page.goto('/');
    const rootNode = page.getByRole('button', { name: 'ルート（中心概念）' });
    await rootNode.click();
    await rootNode.press('Tab');

    const editingInput = page.getByPlaceholder('ラベルを入力');

    // Act: 子ノードの編集 input で Enter を押す。
    await editingInput.press('Enter');

    // Assert: 兄弟ノードが追加される。
    await expect(page.getByRole('button', { name: '無題' })).toBeVisible();
  });

  test('Delete/Backspace で選択中ノードを削除でき、ルートは削除されないこと', async ({ page }) => {
    // Arrange: ルートだけの状態で Delete を試す。
    await page.goto('/');
    const rootNode = page.getByRole('button', { name: 'ルート（中心概念）' });
    await rootNode.click();

    // Act: ルートノードに Delete を押す。
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
