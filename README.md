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

- ノードを **ダブルクリック** するとラベル編集に入ります。
- 編集中は **Enter** または **フォーカスアウト** で保存されます。
- **Tab**: 選択中ノードの子ノードを右側に追加します。
- **Enter**: 選択中ノードの兄弟ノードを下側に追加します。
- **Backspace / Delete**: 選択中ノードを削除します。
- ルートノードは初期表示で選択されています。
- 右下の **org-modeでエクスポート** ボタンで `mindmap.org` をダウンロードできます。

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
