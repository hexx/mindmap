CREATE TABLE IF NOT EXISTS mindmaps (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  nodes_json TEXT NOT NULL,
  edges_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mindmaps_created_at ON mindmaps(created_at DESC);
