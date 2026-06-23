# Mindmap

React Flow + TypeScript + Zustand で作るマインドマップアプリです。

## 使い方

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 開発サーバー起動

```bash
npm run dev
```

### 3. 本番ビルド

```bash
npm run build
```

### 4. ビルド結果の確認

```bash
npm run preview
```

### 5. Cloudflare Workers へのデプロイ

```bash
npm install -D wrangler
npm run deploy
```

Cloudflare D1 を使う場合は `wrangler.toml` の `[[d1_databases]]` を有効化してください。

## 操作方法

### 基本操作

- ノードを **ダブルクリック** するとラベル編集に入ります。
- 編集中は **Enter** または **フォーカスアウト** で保存されます。
- ルートノードは初期表示で選択されています。
- 右上の **メニュー** から各種操作（新規作成・整列・保存・読込・インポート・エクスポート）を利用できます。

### キーボード操作一覧

#### ノード選択時

| macOS | Windows/Linux | 操作 |
|-------|---------------|------|
| `Tab` | `Tab` | 子ノードを追加して編集モードに入る |
| `Return` | `Enter` | 兄弟ノードを追加して編集モードに入る |
| `Delete` / `Backspace` | `Delete` / `Backspace` | 選択中のノードを削除（ルートは不可） |
| `Space` | `Space` | 編集モードに入る |
| `A`-`Z` 等 | `A`-`Z` 等 | 編集モードに入り、入力された文字でラベルを上書き |
| `↑` | `↑` | 上の兄弟ノードへフォーカス移動 |
| `↓` | `↓` | 下の兄弟ノードへフォーカス移動 |
| `←` | `←` | 親ノードへフォーカス移動 |
| `→` | `→` | 子ノードへフォーカス移動 |

#### グローバル操作

| macOS | Windows/Linux | 操作 |
|-------|---------------|------|
| `⌘Z` | `Ctrl+Z` | 操作を元に戻す (Undo) |
| `⌘⇧Z` | `Ctrl+Shift+Z` | 操作をやり直す (Redo) |
| `⌘Y` | `Ctrl+Y` | 操作をやり直す (Redo) |

#### 編集モード時

| macOS | Windows/Linux | 操作 |
|-------|---------------|------|
| `Return` | `Enter` | 編集を確定し、兄弟ノードを追加 |
| `Tab` | `Tab` | 編集を確定し、子ノードを追加 |
| `Escape` | `Escape` | 編集をキャンセル |
| `Backspace`（空ラベル時） | `Backspace`（空ラベル時） | ノードを削除 |

## 構成

- `src/App.tsx` - React Flow キャンバスとキーボード操作
- `src/nodes/MindMapNode.tsx` - インライン編集できるカスタムノード
- `src/store/useStore.ts` - ノードとエッジの Zustand ストア

## 技術スタック

- React
- Vite
- TypeScript
- React Flow
- Zustand
