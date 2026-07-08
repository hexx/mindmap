import { desc, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { Hono, type Context } from 'hono';
import type { CloudMindmapRecord, CloudMindmapSummary } from './utils/cloudMindmapTypes';
import { mindmapsTable } from './db/schema';

type Database = ReturnType<typeof drizzle>;

type Env = {
  DB?: D1Database;
  ASSETS?: Fetcher;
};

type MindmapPayload = Partial<CloudMindmapRecord> & {
  id?: string;
};

const app = new Hono<{ Bindings: Env }>();
const api = new Hono<{ Bindings: Env }>();

const toErrorMessage = (error: unknown) => (error instanceof Error ? error.message : '予期しないエラーが発生しました');

const getDb = (db: D1Database | undefined) => {
  if (!db) {
    throw new Error('D1 binding is not configured');
  }

  return drizzle(db);
};

const toMindmapTitle = (value: unknown) => {
  if (typeof value === 'string') {
    const trimmed = value.trim();

    if (trimmed) {
      return trimmed;
    }
  }

  return '無題のマインドマップ';
};

const loadMindmap = async (db: Database, id: string) => {
  const rows = await db
    .select({
      id: mindmapsTable.id,
      title: mindmapsTable.title,
      nodesJson: mindmapsTable.nodesJson,
      edgesJson: mindmapsTable.edgesJson,
      created_at: mindmapsTable.createdAt,
      updated_at: mindmapsTable.updatedAt,
    })
    .from(mindmapsTable)
    .where(eq(mindmapsTable.id, id))
    .limit(1);

  const row = rows[0];

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    title: row.title,
    created_at: row.created_at,
    updated_at: row.updated_at,
    nodes: JSON.parse(row.nodesJson) as CloudMindmapRecord['nodes'],
    edges: JSON.parse(row.edgesJson) as CloudMindmapRecord['edges'],
  };
};

const upsertMindmap = async (db: Database, payload: MindmapPayload, pathId?: string) => {
  const id = pathId ?? payload.id ?? crypto.randomUUID();
  const title = toMindmapTitle(payload.title);

  if (!Array.isArray(payload.nodes) || !Array.isArray(payload.edges)) {
    throw new Error('nodes and edges must be arrays');
  }

  const existing = await db
    .select({
      createdAt: mindmapsTable.createdAt,
    })
    .from(mindmapsTable)
    .where(eq(mindmapsTable.id, id))
    .limit(1);
  const createdAt = existing[0]?.createdAt ?? new Date().toISOString();
  const updatedAt = new Date().toISOString();

  await db
    .insert(mindmapsTable)
    .values({
      id,
      title,
      nodesJson: JSON.stringify(payload.nodes),
      edgesJson: JSON.stringify(payload.edges),
      createdAt,
      updatedAt,
    })
    .onConflictDoUpdate({
      target: mindmapsTable.id,
      set: {
        title,
        nodesJson: JSON.stringify(payload.nodes),
        edgesJson: JSON.stringify(payload.edges),
        updatedAt,
      },
    });

  return {
    id,
    title,
    created_at: createdAt,
  } satisfies CloudMindmapSummary;
};

const listMindmaps = async (db: Database) =>
  db
    .select({
      id: mindmapsTable.id,
      title: mindmapsTable.title,
      created_at: mindmapsTable.createdAt,
    })
    .from(mindmapsTable)
    .orderBy(desc(mindmapsTable.createdAt), desc(mindmapsTable.id));

const deleteMindmap = async (db: Database, id: string) => {
  const existing = await db
    .select({
      id: mindmapsTable.id,
    })
    .from(mindmapsTable)
    .where(eq(mindmapsTable.id, id))
    .limit(1);

  if (!existing[0]) {
    return false;
  }

  await db.delete(mindmapsTable).where(eq(mindmapsTable.id, id));
  return true;
};

const fetchStaticAsset = async (c: Context<{ Bindings: Env }>) => {
  if (!c.env.ASSETS) {
    return c.json({ error: 'ASSETS binding is not configured' }, 500);
  }

  const assetResponse = await c.env.ASSETS.fetch(c.req.raw);

  if (assetResponse.status !== 404) {
    return assetResponse;
  }

  const url = new URL(c.req.url);

  if (c.req.method !== 'GET' || url.pathname.includes('.')) {
    return assetResponse;
  }

  return c.env.ASSETS.fetch(new Request(new URL('/index.html', url), c.req.raw));
};

api.onError((error, c) => c.json({ error: toErrorMessage(error) }, 500));

api.get('/mindmaps', async (c) => c.json(await listMindmaps(getDb(c.env.DB))));

api.post('/mindmap', async (c) => {
  const payload = (await c.req.json()) as MindmapPayload;
  const savedMindmap = await upsertMindmap(getDb(c.env.DB), payload);

  return c.json(savedMindmap, 201);
});

api.get('/mindmap/:id', async (c) => {
  const record = await loadMindmap(getDb(c.env.DB), c.req.param('id'));

  if (!record) {
    return c.json({ error: 'Mindmap not found' }, 404);
  }

  return c.json(record);
});

api.put('/mindmap/:id', async (c) => {
  const payload = (await c.req.json()) as MindmapPayload;
  return c.json(await upsertMindmap(getDb(c.env.DB), payload, c.req.param('id')));
});

api.delete('/mindmap/:id', async (c) => {
  const deleted = await deleteMindmap(getDb(c.env.DB), c.req.param('id'));

  if (!deleted) {
    return c.json({ error: 'Mindmap not found' }, 404);
  }

  return new Response(null, { status: 204 });
});

// /api プレフィックス付きでルートをマウント
app.route('/api', api);

app.all('*', async (c) => {
  if (c.req.path.startsWith('/api/')) {
    return c.notFound();
  }

  return fetchStaticAsset(c);
});

// app.route によりルート情報が app に含まれるため、typeof app で正しく型推論される
export type AppType = typeof app;
export default app;
