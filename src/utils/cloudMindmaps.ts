import { hc } from 'hono/client';
import type { AppType } from '../worker';
export type {
  CloudMindmapEdge,
  CloudMindmapNode,
  CloudMindmapRecord,
  CloudMindmapSummary,
} from './cloudMindmapTypes';

export type CloudMindmapUpsertPayload = Record<string, unknown>;

export type CloudMindmapRpcClient = {
  api: {
    mindmaps: {
      $get: () => Promise<Response>;
    };
    mindmap: {
      $post: (options: { json: CloudMindmapUpsertPayload }) => Promise<Response>;
      ':id': {
        $get: (options: { param: { id: string } }) => Promise<Response>;
        $put: (options: { param: { id: string }; json: CloudMindmapUpsertPayload }) => Promise<Response>;
        $delete: (options: { param: { id: string } }) => Promise<Response>;
      };
    };
  };
};

export const client = hc<AppType>('/') as CloudMindmapRpcClient;
