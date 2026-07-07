import { index, sqliteTable, text } from 'drizzle-orm/sqlite-core';

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
