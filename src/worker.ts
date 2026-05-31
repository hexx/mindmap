import { desc, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import type { CloudMindmapRecord, CloudMindmapSummary } from './utils/cloudMindmaps';
import { mindmapsTable } from './db/schema';

type Database = ReturnType<typeof drizzle>;

type Env = {
  DB?: D1Database;
  ASSETS?: Fetcher;
};

const toJsonResponse = (data: unknown, init: ResponseInit = {}) =>
  (() => {
    const headers = new Headers(init.headers);
    headers.set('cache-control', 'no-store');

    return Response.json(data, {
      ...init,
      headers,
    });
  })();

const toErrorResponse = (message: string, status: number) => toJsonResponse({ error: message }, { status });

const toErrorMessage = (error: unknown) => (error instanceof Error ? error.message : '予期しないエラーが発生しました');

const parseJsonBody = async <T>(request: Request) => {
  const contentType = request.headers.get('content-type') ?? '';

  if (!contentType.includes('application/json')) {
    throw new Error('Content-Type must be application/json');
  }

  return request.json() as Promise<T>;
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

const upsertMindmap = async (db: Database, request: Request, pathId?: string) => {
  const body = await parseJsonBody<Partial<CloudMindmapRecord> & { id?: string }>(request);
  const id = pathId ?? body.id ?? crypto.randomUUID();
  const title = toMindmapTitle(body.title);

  if (!Array.isArray(body.nodes) || !Array.isArray(body.edges)) {
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
      nodesJson: JSON.stringify(body.nodes),
      edgesJson: JSON.stringify(body.edges),
      createdAt,
      updatedAt,
    })
    .onConflictDoUpdate({
      target: mindmapsTable.id,
      set: {
        title,
        nodesJson: JSON.stringify(body.nodes),
        edgesJson: JSON.stringify(body.edges),
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

const fetchStaticAsset = async (request: Request, env: Env) => {
  if (!env.ASSETS) {
    return toErrorResponse('ASSETS binding is not configured', 500);
  }

  const assetResponse = await env.ASSETS.fetch(request);

  if (assetResponse.status !== 404) {
    return assetResponse;
  }

  const url = new URL(request.url);

  if (request.method !== 'GET' || url.pathname.includes('.')) {
    return assetResponse;
  }

  return env.ASSETS.fetch(new Request(new URL('/index.html', url), request));
};

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);

    if (!url.pathname.startsWith('/api/')) {
      return fetchStaticAsset(request, env);
    }

    if (!env.DB) {
      return toErrorResponse('D1 binding is not configured', 500);
    }

    const db = drizzle(env.DB);

    try {
      if (request.method === 'GET' && url.pathname === '/api/mindmaps') {
        return toJsonResponse(await listMindmaps(db));
      }

      if (request.method === 'POST' && url.pathname === '/api/mindmap') {
        return toJsonResponse(await upsertMindmap(db, request), { status: 201 });
      }

      const mindmapMatch = url.pathname.match(/^\/api\/mindmap\/([^/]+)$/);

      if (!mindmapMatch) {
        return toErrorResponse('Not found', 404);
      }

      const mindmapId = decodeURIComponent(mindmapMatch[1]);

      if (request.method === 'GET') {
        const record = await loadMindmap(db, mindmapId);

        if (!record) {
          return toErrorResponse('Mindmap not found', 404);
        }

        return toJsonResponse(record);
      }

      if (request.method === 'PUT' || request.method === 'PATCH') {
        return toJsonResponse(await upsertMindmap(db, request, mindmapId));
      }

      if (request.method === 'DELETE') {
        const deleted = await deleteMindmap(db, mindmapId);

        if (!deleted) {
          return toErrorResponse('Mindmap not found', 404);
        }

        return new Response(null, { status: 204 });
      }

      return toErrorResponse('Method not allowed', 405);
    } catch (error) {
      return toErrorResponse(toErrorMessage(error), 500);
    }
  },
};
