# データベースマイグレーションガイド

## 概要

このプロジェクトは Cloudflare D1 をデータベースとして使用し、Drizzle ORM でクエリを構築しています。
現時点では `drizzle-kit` による自動マイグレーション管理は導入されておらず、`schema.sql` をベースに手動でスキーマを管理しています。

## 現在のスキーマ

```sql
-- mindmaps テーブル
CREATE TABLE IF NOT EXISTS mindmaps (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  nodes_json TEXT NOT NULL,   -- JSON文字列: MindMapNode[]
  edges_json TEXT NOT NULL,   -- JSON文字列: MindMapEdge[]
  created_at TEXT NOT NULL,   -- ISO 8601形式
  updated_at TEXT NOT NULL    -- ISO 8601形式
);

-- 一覧取得のパフォーマンス用インデックス
CREATE INDEX IF NOT EXISTS idx_mindmaps_created_at ON mindmaps(created_at DESC);
```

### 対応する Drizzle スキーマ

`src/db/schema.ts`:
```ts
export const mindmapsTable = sqliteTable(
  'mindmaps',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    nodesJson: text('nodes_json').notNull(),
    edgesJson: text('edges_json').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [index('idx_mindmaps_created_at').on(table.createdAt)],
);
```

> **重要**: `schema.sql` と `db/schema.ts` は常に一致させてください。Drizzle スキーマを変更した場合は、`schema.sql` も同時に更新します。

---

## マイグレーションの種類と実行手順

### 1. 初回セットアップ（新規環境）

D1 データベースを作成し、初期スキーマを適用します。

```bash
# 1. D1 データベースを作成
wrangler d1 create mindmap

# 2. wrangler.toml に D1 バインディングを設定
# [[d1_databases]]
# binding = "DB"
# database_name = "mindmap"
# database_id = "<作成時に表示されたID>"

# 3. スキーマを適用
wrangler d1 execute mindmap --file=schema.sql

# 4. デプロイ
npm run deploy
```

### 2. 既存運用環境へのマイグレーション（スキーマ変更）

すでに運用中の D1 データベースに変更を適用する場合、**必ず `IF NOT EXISTS` を使用した冪等な SQL を実行します**。

#### 今回の変更（インデックス追加）

```bash
# ローカル確認（オプション）
wrangler d1 execute mindmap --local --command "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_mindmaps_created_at';"

# 本番環境にインデックスを追加（冪等）
wrangler d1 execute mindmap --command "CREATE INDEX IF NOT EXISTS idx_mindmaps_created_at ON mindmaps(created_at DESC);"
```

> **確認**: 上記コマンドは `IF NOT EXISTS` を使用しているため、インデックスが既に存在する場合は何も変更されません。本番環境で安全に実行できます。

#### 一般的なスキーマ変更パターン

| 変更内容 | SQL (冪等) | 備考 |
|---------|-----------|------|
| カラム追加 | `ALTER TABLE mindmaps ADD COLUMN new_col TEXT;` | SQLite は `IF NOT EXISTS` 非対応。アプリ側で存在チェック後に実行 |
| インデックス追加 | `CREATE INDEX IF NOT EXISTS idx_name ON mindmaps(col);` | 安全に再実行可能 |
| インデックス削除 | `DROP INDEX IF EXISTS idx_name;` | 安全に再実行可能 |
| テーブル追加 | `CREATE TABLE IF NOT EXISTS new_table (...);` | 安全に再実行可能 |

> ⚠️ **SQLite / D1 の制約**: `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` は SQLite でサポートされていません。カラム追加時はアプリケーション側で事前に存在チェックを行うか、別途マイグレーションスクリプトを用意してください。

---

## マイグレーション運用ルール

### 変更の流れ

```
1. src/db/schema.ts を修正（Drizzle スキーマ）
2. schema.sql を修正（生SQL。本番適用用）
3. マイグレーションSQL を本番 D1 に実行
4. アプリケーションをデプロイ
```

### デプロイ前チェックリスト

- [ ] `schema.sql` と `db/schema.ts` の内容が一致している
- [ ] マイグレーションSQL が冪等である（`IF NOT EXISTS` / `IF EXISTS` を使用）
- [ ] ローカル D1 でマイグレーションを事前テスト済み
- [ ] 本番 D1 へのマイグレーション実行後、アプリケーションをデプロイ

---

## 将来の改善案: drizzle-kit の導入

現在は手動マイグレーションですが、以下のタイミングで `drizzle-kit` の導入を推奨します。

### 導入のメリット
- Drizzle スキーマから自動でマイグレーションSQLを生成
- マイグレーション履歴の追跡が容易
- ロールバックが管理しやすい
- `schema.sql` の手動メンテナンスが不要になる

### 導入手順（概要）

```bash
# 1. drizzle-kit をインストール
npm install -D drizzle-kit

# 2. drizzle.config.ts を作成
# 3. 初期マイグレーションを生成
npx drizzle-kit generate

# 4. マイグレーションを適用
wrangler d1 execute mindmap --file=drizzle/0000_initial.sql

# 5. 以降、スキーマ変更時に generate → apply を繰り返す
```

> **注意**: drizzle-kit 導入時は、既存の本番データを保持したまま移行するための手順を別途検討してください。特に、drizzle-kit が生成するマイグレーションテーブル (`__drizzle_migrations`) との整合性に注意が必要です。
