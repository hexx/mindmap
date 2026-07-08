import { hc } from 'hono/client';
import type { AppType } from '../worker';
export type {
  CloudMindmapEdge,
  CloudMindmapNode,
  CloudMindmapRecord,
  CloudMindmapSummary,
} from './cloudMindmapTypes';

// NOTE: hc<AppType> の直接の型推論が Hono v4 の制限により機能しないため、
// 手動でクライアント型を定義している。worker.ts のルート定義を変更した場合は
// この型定義も同期して更新すること。
export type CloudMindmapClient = {
  api: {
    mindmaps: {
      $get: () => Promise<Response>;
    };
    mindmap: {
      $post: (options: { json: Record<string, unknown> }) => Promise<Response>;
      ':id': {
        $get: (options: { param: { id: string } }) => Promise<Response>;
        $put: (options: { param: { id: string }; json: Record<string, unknown> }) => Promise<Response>;
        $delete: (options: { param: { id: string } }) => Promise<Response>;
      };
    };
  };
};

export const client = hc<AppType>('/') as unknown as CloudMindmapClient;
