import { describe, expect, it, beforeEach, vi } from 'vitest';

// ── In-memory store to simulate D1 via mocked drizzle ────────────────────
let memoryStore: Map<string, Record<string, unknown>>;

beforeEach(() => {
  memoryStore = new Map();
});

// ── Mock drizzle-orm/d1 ─────────────────────────────────────────────────
// We mock the drizzle() factory to return a query builder that reads/writes
// our in-memory store instead of a real D1 database.

const createQueryProxy = (): Record<string, unknown> => {
  // Each chain method returns a new proxy so calls compose naturally.
  // The proxy records the operation and executes when awaited (thenable).

  // Use a mutable "plan" object that gets populated by method calls.
  const plan: {
    type: string;
    table: string;
    columns?: string[];
    conditions?: Array<{ column: string; op: string; value: unknown }>;
    values?: Record<string, unknown>;
    conflictTarget?: string;
    updateSet?: Record<string, unknown>;
    orderBy?: Array<{ column: string; dir: string }>;
    limit?: number;
  } = { type: 'unknown', table: 'mindmaps' };

  const chainMethods: Record<string, (...args: unknown[]) => unknown> = {
    select: (...cols: unknown[]) => {
      plan.type = 'select';
      plan.columns = cols.map((c) => {
        if (typeof c === 'object' && c !== null && 'name' in (c as Record<string, unknown>)) {
          return (c as Record<string, unknown>).name as string;
        }
        return String(c);
      });
      return createThenable(plan);
    },
    from: (_table: unknown) => {
      plan.table = 'mindmaps';
      return createThenable(plan);
    },
    where: (condition: unknown) => {
      // Simplified condition extraction
      if (condition && typeof condition === 'object') {
        plan.conditions = plan.conditions || [];
        const c = condition as Record<string, unknown>;
        if (c.type === 'eq') {
          plan.conditions.push({
            column: (c.left as Record<string, string>)?.name || String(c.left),
            op: 'eq',
            value: c.right,
          });
        }
      }
      return createThenable(plan);
    },
    orderBy: (...clauses: unknown[]) => {
      plan.orderBy = clauses.map((c) => {
        const clause = c as Record<string, unknown>;
        return {
          column: (clause.column as Record<string, string>)?.name || String(clause.column),
          dir: clause.type === 'desc' ? 'desc' : 'asc',
        };
      });
      return createThenable(plan);
    },
    limit: (n: number) => {
      plan.limit = n;
      return createThenable(plan);
    },
    insert: (_table: unknown) => {
      plan.type = 'insert';
      plan.table = 'mindmaps';
      return createThenable(plan);
    },
    values: (vals: Record<string, unknown>) => {
      plan.values = vals;
      return createThenable(plan);
    },
    onConflictDoUpdate: (opts: { target: unknown; set: Record<string, unknown> }) => {
      plan.conflictTarget = 'id';
      plan.updateSet = opts.set;
      return createThenable(plan);
    },
    delete: (_table: unknown) => {
      plan.type = 'delete';
      plan.table = 'mindmaps';
      return createThenable(plan);
    },
  };

  // Create a thenable that executes the plan when awaited
  const createThenable = (p: typeof plan) => {
    const execute = async (): Promise<unknown> => {
      switch (p.type) {
        case 'select': {
          let rows = Array.from(memoryStore.values());

          // Apply conditions
          if (p.conditions) {
            for (const cond of p.conditions) {
              if (cond.op === 'eq') {
                rows = rows.filter((row) => {
                  // Map column names: id, created_at → id, createdAt
                  const colMap: Record<string, string> = {
                    id: 'id',
                    title: 'title',
                    nodesJson: 'nodesJson',
                    edgesJson: 'edgesJson',
                    created_at: 'createdAt',
                    updated_at: 'updatedAt',
                    createdAt: 'createdAt',
                    updatedAt: 'updatedAt',
                  };
                  const mappedCol = colMap[cond.column] || cond.column;
                  return row[mappedCol] === cond.value;
                });
              }
            }
          }

          // Apply ordering
          if (p.orderBy) {
            for (const ord of p.orderBy) {
              const colMap: Record<string, string> = {
                created_at: 'createdAt',
                updated_at: 'updatedAt',
              };
              const mappedCol = colMap[ord.column] || ord.column;
              rows.sort((a, b) => {
                const av = String(a[mappedCol] ?? '');
                const bv = String(b[mappedCol] ?? '');
                return ord.dir === 'desc' ? bv.localeCompare(av) : av.localeCompare(bv);
              });
            }
          }

          // Apply limit
          if (p.limit !== undefined && p.limit > 0) {
            rows = rows.slice(0, p.limit);
          }

          return rows;
        }
        case 'insert': {
          if (!p.values) return [];
          const id = p.values.id as string || 'auto-id';

          if (memoryStore.has(id) && p.conflictTarget === 'id' && p.updateSet) {
            // Upsert - update existing
            const existing = memoryStore.get(id)!;
            const updated = { ...existing };
            for (const [key, val] of Object.entries(p.updateSet)) {
              updated[key] = val;
            }
            memoryStore.set(id, updated);
          } else {
            memoryStore.set(id, { ...p.values });
          }
          return [];
        }
        case 'delete': {
          // Apply conditions
          if (p.conditions) {
            for (const cond of p.conditions) {
              if (cond.op === 'eq') {
                const colMap: Record<string, string> = {
                  id: 'id',
                  created_at: 'createdAt',
                };
                const mappedCol = colMap[cond.column] || cond.column;
                if (mappedCol === 'id') {
                  memoryStore.delete(cond.value as string);
                }
              }
            }
          }
          return [];
        }
        default:
          return [];
      }
    };

    // Build a chainable proxy that is also awaitable (required for drizzle mock)
    const result: Record<string, unknown> = {};
    for (const [key, method] of Object.entries(chainMethods)) {
      result[key] = (...args: unknown[]) => {
        method(...args);
        return result;
      };
    }
    // eslint-disable-next-line unicorn/no-thenable -- drizzle mock requires thenable for chain+await
    (result as unknown as { then: (cb: (v: unknown) => void) => void }).then = (cb: (v: unknown) => void) => {
      execute().then(cb);
    };

    return result;
  };

  return createThenable(plan);
};

// Mock drizzle-orm/d1
vi.mock('drizzle-orm/d1', () => {
  const drizzle = () => createQueryProxy();
  return { drizzle };
});

// hoisted: mock helpers must be defined before vi.mock (which is hoisted)
const { mockEq, mockDesc } = vi.hoisted(() => {
  return {
    mockEq: (left: unknown, right: unknown) => ({
      type: 'eq',
      left,
      right,
    }),
    mockDesc: (col: unknown) => ({
      type: 'desc',
      column: col,
    }),
  };
});

// Mock drizzle-orm (for eq, desc used in worker.ts)
vi.mock('drizzle-orm', () => ({
  eq: mockEq,
  desc: mockDesc,
}));

// Now import the app after mocks are set up
import app from './worker';

// ── Helper: create a Request with mocked D1 binding ──────────────────────
const createD1Binding = () => {
  return {} as D1Database; // Drizzle mock doesn't use the real D1Database
};

const request = (method: string, path: string, body?: unknown) => {
  const url = new URL(`http://localhost${path}`);
  const init: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }
  return new Request(url, init);
};

// ── Tests ────────────────────────────────────────────────────────────────
describe('worker API integration tests', () => {
  beforeEach(() => {
    memoryStore.clear();
  });

  describe('GET /api/mindmaps', () => {
    it('空の状態で一覧取得 → 200, []', async () => {
      const res = await app.fetch(
        request('GET', '/api/mindmaps'),
        { DB: createD1Binding() },
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual([]);
    });

    it('データがある場合、一覧が返る', async () => {
      // Directly insert a row into memoryStore for this test
      memoryStore.set('test-1', {
        id: 'test-1',
        title: 'テスト',
        nodesJson: '[]',
        edgesJson: '[]',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      });

      const res = await app.fetch(
        request('GET', '/api/mindmaps'),
        { DB: createD1Binding() },
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/mindmap', () => {
    it('正常作成 → 201, 作成されたレコード', async () => {
      const payload = {
        title: '新しいマインドマップ',
        nodes: [{ id: 'root', type: 'mindmap', position: { x: 0, y: 0 }, data: { label: 'Root' } }],
        edges: [],
      };

      const res = await app.fetch(
        request('POST', '/api/mindmap', payload),
        { DB: createD1Binding() },
      );
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body).toHaveProperty('id');
      expect(body.title).toBe('新しいマインドマップ');
      expect(body).toHaveProperty('created_at');
    });

    it('nodes が配列でない → 500 (onError)', async () => {
      const payload = {
        title: '不正データ',
        nodes: 'not-an-array',
        edges: [],
      };

      const res = await app.fetch(
        request('POST', '/api/mindmap', payload),
        { DB: createD1Binding() },
      );
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body).toHaveProperty('error');
    });

    it('JSONではないボディ → 500 (onError)', async () => {
      const url = new URL('http://localhost/api/mindmap');
      const req = new Request(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not valid json{{{',
      });

      const res = await app.fetch(req, { DB: createD1Binding() });
      expect(res.status).toBe(500);
    });
  });

  describe('GET /api/mindmap/:id', () => {
    it('存在するID → 200, レコード', async () => {
      memoryStore.set('existing-id', {
        id: 'existing-id',
        title: '既存マップ',
        nodesJson: JSON.stringify([{ id: 'root', position: { x: 0, y: 0 }, data: { label: 'Root' } }]),
        edgesJson: '[]',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      });

      const res = await app.fetch(
        request('GET', '/api/mindmap/existing-id'),
        { DB: createD1Binding() },
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.id).toBe('existing-id');
      expect(body.title).toBe('既存マップ');
      expect(body).toHaveProperty('nodes');
      expect(body).toHaveProperty('edges');
    });

    it('存在しないID → 404', async () => {
      const res = await app.fetch(
        request('GET', '/api/mindmap/non-existent'),
        { DB: createD1Binding() },
      );
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/mindmap/:id', () => {
    it('存在するIDの更新 → 200', async () => {
      memoryStore.set('update-id', {
        id: 'update-id',
        title: '更新前',
        nodesJson: '[]',
        edgesJson: '[]',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      });

      const payload = {
        title: '更新後',
        nodes: [{ id: 'root', position: { x: 0, y: 0 }, data: { label: 'Updated' } }],
        edges: [],
      };

      const res = await app.fetch(
        request('PUT', '/api/mindmap/update-id', payload),
        { DB: createD1Binding() },
      );
      expect(res.status).toBe(200);
    });

    it('存在しないID（upsert）→ 200', async () => {
      const payload = {
        title: '新規upsert',
        nodes: [{ id: 'root', position: { x: 0, y: 0 }, data: { label: 'New' } }],
        edges: [],
      };

      const res = await app.fetch(
        request('PUT', '/api/mindmap/new-upsert-id', payload),
        { DB: createD1Binding() },
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.id).toBe('new-upsert-id');
    });
  });

  describe('DELETE /api/mindmap/:id', () => {
    it('存在するID → 204', async () => {
      memoryStore.set('delete-me', {
        id: 'delete-me',
        title: '削除対象',
        nodesJson: '[]',
        edgesJson: '[]',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      });

      const res = await app.fetch(
        request('DELETE', '/api/mindmap/delete-me'),
        { DB: createD1Binding() },
      );
      expect(res.status).toBe(204);
    });

    it('存在しないID → 404', async () => {
      const res = await app.fetch(
        request('DELETE', '/api/mindmap/ghost-id'),
        { DB: createD1Binding() },
      );
      expect(res.status).toBe(404);
    });
  });

  describe('CRUD 一連の流れ', () => {
    it('作成 → 一覧に含まれる → 取得 → 更新 → 削除 → 一覧にない', async () => {
      // 1. 作成
      const createPayload = {
        title: 'CRUDテスト',
        nodes: [{ id: 'root', position: { x: 0, y: 0 }, data: { label: 'Root' } }],
        edges: [],
      };
      const createRes = await app.fetch(
        request('POST', '/api/mindmap', createPayload),
        { DB: createD1Binding() },
      );
      expect(createRes.status).toBe(201);
      const created = await createRes.json() as { id: string };
      const createdId = created.id;

      // 2. 一覧に含まれる
      const listRes = await app.fetch(
        request('GET', '/api/mindmaps'),
        { DB: createD1Binding() },
      );
      const list = await listRes.json() as Array<{ id: string }>;
      expect(list.some((item) => item.id === createdId)).toBe(true);

      // 3. 取得
      const getRes = await app.fetch(
        request('GET', `/api/mindmap/${createdId}`),
        { DB: createD1Binding() },
      );
      expect(getRes.status).toBe(200);
      const fetched = await getRes.json() as { id: string };
      expect(fetched.id).toBe(createdId);

      // 4. 更新
      const updatePayload = {
        title: 'CRUDテスト更新',
        nodes: [{ id: 'root', position: { x: 0, y: 0 }, data: { label: 'Updated' } }],
        edges: [],
      };
      const updateRes = await app.fetch(
        request('PUT', `/api/mindmap/${createdId}`, updatePayload),
        { DB: createD1Binding() },
      );
      expect(updateRes.status).toBe(200);

      // 5. 削除
      const deleteRes = await app.fetch(
        request('DELETE', `/api/mindmap/${createdId}`),
        { DB: createD1Binding() },
      );
      expect(deleteRes.status).toBe(204);

      // 6. 一覧にない
      const listAfterRes = await app.fetch(
        request('GET', '/api/mindmaps'),
        { DB: createD1Binding() },
      );
      const listAfter = await listAfterRes.json() as Array<{ id: string }>;
      expect(listAfter.some((item) => item.id === createdId)).toBe(false);
    });
  });
});
