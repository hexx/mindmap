import type { CloudMindmapRecord, CloudMindmapSummary } from './src/utils/cloudMindmaps';

type Env = {
  DB?: D1Database;
  ASSETS?: Fetcher;
};

type MindmapRow = {
  id: string;
  title: string;
  nodes_json: string;
  edges_json: string;
  created_at: string;
  updated_at: string;
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

const loadMindmap = async (db: D1Database, id: string) => {
  const row = await db
    .prepare('SELECT id, title, nodes_json, edges_json, created_at, updated_at FROM mindmaps WHERE id = ?')
    .bind(id)
    .first<MindmapRow>();

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    title: row.title,
    created_at: row.created_at,
    updated_at: row.updated_at,
    nodes: JSON.parse(row.nodes_json) as CloudMindmapRecord['nodes'],
    edges: JSON.parse(row.edges_json) as CloudMindmapRecord['edges'],
  };
};

const upsertMindmap = async (db: D1Database, request: Request, pathId?: string) => {
  const body = await parseJsonBody<Partial<CloudMindmapRecord> & { id?: string }>(request);
  const id = pathId ?? body.id ?? crypto.randomUUID();
  const title = toMindmapTitle(body.title);

  if (!Array.isArray(body.nodes) || !Array.isArray(body.edges)) {
    throw new Error('nodes and edges must be arrays');
  }

  const existing = await db.prepare('SELECT created_at FROM mindmaps WHERE id = ?').bind(id).first<{ created_at: string }>();
  const createdAt = existing?.created_at ?? new Date().toISOString();
  const updatedAt = new Date().toISOString();

  await db
    .prepare(
      'INSERT INTO mindmaps (id, title, nodes_json, edges_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?) ' +
        'ON CONFLICT(id) DO UPDATE SET title = excluded.title, nodes_json = excluded.nodes_json, edges_json = excluded.edges_json, updated_at = excluded.updated_at',
    )
    .bind(id, title, JSON.stringify(body.nodes), JSON.stringify(body.edges), createdAt, updatedAt)
    .run();

  return {
    id,
    title,
    created_at: createdAt,
  } satisfies CloudMindmapSummary;
};

const listMindmaps = async (db: D1Database) => {
  const result = await db
    .prepare('SELECT id, title, created_at FROM mindmaps ORDER BY created_at DESC, id DESC')
    .all<CloudMindmapSummary>();

  return result.results ?? [];
};

const deleteMindmap = async (db: D1Database, id: string) => {
  const existing = await db.prepare('SELECT id FROM mindmaps WHERE id = ?').bind(id).first<{ id: string }>();

  if (!existing) {
    return false;
  }

  await db.prepare('DELETE FROM mindmaps WHERE id = ?').bind(id).run();
  return true;
};

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);

    if (!url.pathname.startsWith('/api/')) {
      if (!env.ASSETS) {
        return toErrorResponse('ASSETS binding is not configured', 500);
      }

      return env.ASSETS.fetch(request);
    }

    if (!env.DB) {
      return toErrorResponse('D1 binding is not configured', 500);
    }

    try {
      if (request.method === 'GET' && url.pathname === '/api/mindmaps') {
        return toJsonResponse(await listMindmaps(env.DB));
      }

      if (request.method === 'POST' && url.pathname === '/api/mindmap') {
        return toJsonResponse(await upsertMindmap(env.DB, request), { status: 201 });
      }

      const mindmapMatch = url.pathname.match(/^\/api\/mindmap\/([^/]+)$/);

      if (!mindmapMatch) {
        return toErrorResponse('Not found', 404);
      }

      const mindmapId = decodeURIComponent(mindmapMatch[1]);

      if (request.method === 'GET') {
        const record = await loadMindmap(env.DB, mindmapId);

        if (!record) {
          return toErrorResponse('Mindmap not found', 404);
        }

        return toJsonResponse(record);
      }

      if (request.method === 'PUT' || request.method === 'PATCH') {
        return toJsonResponse(await upsertMindmap(env.DB, request, mindmapId));
      }

      if (request.method === 'DELETE') {
        const deleted = await deleteMindmap(env.DB, mindmapId);

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
