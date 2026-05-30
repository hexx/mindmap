import type { Edge, XYPosition } from '@xyflow/react';

export type CloudMindmapSummary = {
  id: string;
  title: string;
  created_at: string;
};

export type CloudMindmapNode = {
  id: string;
  type?: string;
  position: XYPosition;
  data: {
    label: string;
  };
  selected?: boolean;
  className?: string;
};

export type CloudMindmapEdge = Edge;

export type CloudMindmapRecord = CloudMindmapSummary & {
  nodes: CloudMindmapNode[];
  edges: CloudMindmapEdge[];
};

export const CLOUD_API_BASE = '/api';

export const getCloudMindmapsUrl = () => `${CLOUD_API_BASE}/mindmaps`;

export const getCloudMindmapUrl = (id: string) => `${CLOUD_API_BASE}/mindmap/${encodeURIComponent(id)}`;
