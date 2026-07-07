import { hc } from 'hono/client';
import type { AppType } from '../worker';
export type {
  CloudMindmapEdge,
  CloudMindmapNode,
  CloudMindmapRecord,
  CloudMindmapSummary,
} from './cloudMindmapTypes';
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

export const client: CloudMindmapClient = hc<AppType>('/') as CloudMindmapClient;
