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

export const MINDMAP_NODE_TYPE = 'mindmap';
export const ROOT_NODE_ID = 'root';

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
  addChildNode: (parentId: string) => string | null;
  addSiblingNode: (nodeId: string) => string | null;
  removeNode: (nodeId: string) => void;
  updateNodeLabel: (nodeId: string, label: string) => void;
};

export const getSelectedNode = (nodes: MindMapNode[]) => nodes.find((node) => node.selected);

const createNodeId = () => {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return `node-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
};

const createRootNode = (): MindMapNode => ({
  id: ROOT_NODE_ID,
  type: MINDMAP_NODE_TYPE,
  position: { x: 0, y: 0 },
  data: { label: 'ルート（中心概念）' },
  selected: true,
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

export const useStore = create<MindMapState>((set, get) => ({
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
      const nextNodes = state.nodes.map((node) => ({
        ...node,
        selected: false,
      }));

      const nextNode: MindMapNode = {
        id: nodeId,
        type: MINDMAP_NODE_TYPE,
        position,
        data,
        selected: true,
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
        nodes: [...nextNodes, nextNode],
        edges: nextEdges,
      };
    });

    return nodeId;
  },
  addChildNode: (parentId) => {
    const { nodes, edges } = get();
    const parentNode = nodes.find((node) => node.id === parentId);

    if (!parentNode) {
      return null;
    }

    const nodeId = createNodeId();
    const nextNode: MindMapNode = {
      id: nodeId,
      type: MINDMAP_NODE_TYPE,
      position: {
        x: parentNode.position.x + 250,
        y: parentNode.position.y,
      },
      data: { label: '' },
      selected: true,
    };

    set({
      nodes: [
        ...nodes.map((node) => ({
          ...node,
          selected: false,
        })),
        nextNode,
      ],
      edges: [
        ...edges,
        {
          id: `${parentId}-${nodeId}`,
          source: parentId,
          target: nodeId,
        },
      ],
    });

    return nodeId;
  },
  addSiblingNode: (nodeId) => {
    const { nodes, edges } = get();
    const currentNode = nodes.find((node) => node.id === nodeId);
    const parentId = edges.find((edge) => edge.target === nodeId)?.source;

    if (!currentNode || !parentId) {
      return null;
    }

    const siblingId = createNodeId();
    const nextNode: MindMapNode = {
      id: siblingId,
      type: MINDMAP_NODE_TYPE,
      position: {
        x: currentNode.position.x,
        y: currentNode.position.y + 100,
      },
      data: { label: '' },
      selected: true,
    };

    set({
      nodes: [
        ...nodes.map((node) => ({
          ...node,
          selected: false,
        })),
        nextNode,
      ],
      edges: [
        ...edges,
        {
          id: `${parentId}-${siblingId}`,
          source: parentId,
          target: siblingId,
        },
      ],
    });

    return siblingId;
  },
  removeNode: (nodeId) =>
    set((state) => {
      if (nodeId === ROOT_NODE_ID) {
        return state;
      }

      const descendantIds = collectDescendants(nodeId, state.edges);
      const parentId = state.edges.find((edge) => edge.target === nodeId)?.source;
      const remainingNodes = state.nodes.filter((node) => !descendantIds.has(node.id));
      const remainingEdges = state.edges.filter(
        (edge) => !descendantIds.has(edge.source) && !descendantIds.has(edge.target),
      );
      const nextSelectedId = parentId && remainingNodes.some((node) => node.id === parentId)
        ? parentId
        : remainingNodes[0]?.id;

      return {
        nodes: remainingNodes.map((node) => ({
          ...node,
          selected: node.id === nextSelectedId,
        })),
        edges: remainingEdges,
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
