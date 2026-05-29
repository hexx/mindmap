import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type XYPosition,
} from '@xyflow/react';
import { create } from 'zustand';

export type MindMapNodeData = {
  label: string;
};

export type MindMapNode = Node<MindMapNodeData>;
export type MindMapEdge = Edge;

type CreateNodeInput = {
  data: MindMapNodeData;
  position: XYPosition;
  parentId?: string;
  id?: string;
};

type MindMapState = {
  nodes: MindMapNode[];
  edges: MindMapEdge[];
  setNodes: (nodes: MindMapNode[]) => void;
  setEdges: (edges: MindMapEdge[]) => void;
  resetGraph: () => void;
  onNodesChange: (changes: NodeChange<MindMapNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<MindMapEdge>[]) => void;
  onConnect: (connection: Connection) => void;
  addNode: (input: CreateNodeInput) => string;
  removeNode: (nodeId: string) => void;
  updateNodeLabel: (nodeId: string, label: string) => void;
};

const ROOT_NODE_ID = 'root';

const createNodeId = () => {
  const randomUUID = globalThis.crypto?.randomUUID;

  if (typeof randomUUID === 'function') {
    return randomUUID();
  }

  return `node-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
};

const createRootNode = (): MindMapNode => ({
  id: ROOT_NODE_ID,
  position: { x: 0, y: 0 },
  data: { label: 'ルート（中心概念）' },
  className: 'mindmap-root-node',
});

const createInitialGraph = () => ({
  nodes: [createRootNode()],
  edges: [],
});

const collectDescendants = (nodeId: string, edges: MindMapEdge[]) => {
  const descendantIds = new Set<string>([nodeId]);
  let expanded = true;

  while (expanded) {
    expanded = false;

    for (const edge of edges) {
      if (descendantIds.has(edge.source) && !descendantIds.has(edge.target)) {
        descendantIds.add(edge.target);
        expanded = true;
      }
    }
  }

  return descendantIds;
};

export const useStore = create<MindMapState>((set) => ({
  ...createInitialGraph(),
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  resetGraph: () => set(createInitialGraph()),
  onNodesChange: (changes) =>
    set((state) => ({
      nodes: applyNodeChanges(changes, state.nodes),
    })),
  onEdgesChange: (changes) =>
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges),
    })),
  onConnect: (connection) =>
    set((state) => ({
      edges: addEdge(connection, state.edges),
    })),
  addNode: ({ data, position, parentId, id }) => {
    const nodeId = id ?? createNodeId();

    set((state) => {
      const nextNode: MindMapNode = {
        id: nodeId,
        position,
        data,
      };

      const nextEdges = parentId
        ? [
            ...state.edges,
            {
              id: `${parentId}-${nodeId}`,
              source: parentId,
              target: nodeId,
            },
          ]
        : state.edges;

      return {
        nodes: [...state.nodes, nextNode],
        edges: nextEdges,
      };
    });

    return nodeId;
  },
  removeNode: (nodeId) =>
    set((state) => {
      const descendantIds = collectDescendants(nodeId, state.edges);

      return {
        nodes: state.nodes.filter((node) => !descendantIds.has(node.id)),
        edges: state.edges.filter(
          (edge) => !descendantIds.has(edge.source) && !descendantIds.has(edge.target),
        ),
      };
    }),
  updateNodeLabel: (nodeId, label) =>
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                label,
              },
            }
          : node,
      ),
    })),
}));
