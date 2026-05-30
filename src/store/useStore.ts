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
import { stratify, tree } from 'd3-hierarchy';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

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

type FocusDirection = 'up' | 'down' | 'left' | 'right';

type LayoutEntry = {
  id: string;
  parentId: string | null;
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
  moveFocus: (direction: FocusDirection) => void;
  updateNodeParent: (nodeId: string, newParentId: string) => void;
  applyAutoLayout: () => void;
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

const getParentId = (nodeId: string, edges: MindMapEdge[]) => edges.find((edge) => edge.target === nodeId)?.source;

const getNodeOrder = (nodes: MindMapNode[]) => new Map(nodes.map((node, index) => [node.id, index]));

const compareByYThenOrder = (nodeOrder: Map<string, number>) => (left: MindMapNode, right: MindMapNode) =>
  left.position.y - right.position.y || (nodeOrder.get(left.id) ?? 0) - (nodeOrder.get(right.id) ?? 0);

const compareByDistanceThenOrder = (
  currentY: number,
  nodeOrder: Map<string, number>,
  direction: 'up' | 'down',
) => (left: MindMapNode, right: MindMapNode) => {
  const leftDistance = direction === 'up' ? currentY - left.position.y : left.position.y - currentY;
  const rightDistance = direction === 'up' ? currentY - right.position.y : right.position.y - currentY;

  return leftDistance - rightDistance || (nodeOrder.get(left.id) ?? 0) - (nodeOrder.get(right.id) ?? 0);
};

const getRootChildIds = (nodes: MindMapNode[], edges: MindMapEdge[]) => {
  const nodeOrder = getNodeOrder(nodes);

  return nodes
    .filter((node) => getParentId(node.id, edges) === ROOT_NODE_ID)
    .sort((left, right) => (nodeOrder.get(left.id) ?? 0) - (nodeOrder.get(right.id) ?? 0))
    .map((node) => node.id);
};

const splitRootChildIds = (rootChildIds: string[]) =>
  rootChildIds.reduce(
    (groups, nodeId, index) => {
      const targetGroup = index % 2 === 0 ? groups.right : groups.left;
      targetGroup.push(nodeId);
      return groups;
    },
    {
      right: [] as string[],
      left: [] as string[],
    },
  );

const buildRadialPositions = (nodes: MindMapNode[], rootChildIds: string[], edges: MindMapEdge[], invertX: boolean) => {
  if (rootChildIds.length === 0) {
    return new Map<string, XYPosition>([[ROOT_NODE_ID, { x: 0, y: 0 }]]);
  }

  const nodeOrder = getNodeOrder(nodes);
  const nodeIds = new Set<string>([ROOT_NODE_ID]);

  rootChildIds.forEach((rootChildId) => {
    collectDescendants(rootChildId, edges).forEach((nodeId) => nodeIds.add(nodeId));
  });

  const hierarchy = stratify<LayoutEntry>()(
    Array.from(nodeIds)
      .sort((left, right) => (nodeOrder.get(left) ?? 0) - (nodeOrder.get(right) ?? 0))
      .map((id) => ({
        id,
        parentId: id === ROOT_NODE_ID ? null : getParentId(id, edges) ?? ROOT_NODE_ID,
      })),
  );
  const laidOutRoot = tree<LayoutEntry>().nodeSize([100, 300])(hierarchy);

  const positions = new Map<string, XYPosition>();

  for (const node of laidOutRoot.descendants()) {
    if (!node.id) {
      continue;
    }

    positions.set(node.id, {
      x: node.id === ROOT_NODE_ID ? 0 : invertX ? -node.y : node.y,
      y: node.x,
    });
  }

  return positions;
};

export const useStore = create<MindMapState>()(
  persist(
    (set, get) => ({
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
        const rootChildCount = nodes.filter((node) => getParentId(node.id, edges) === ROOT_NODE_ID).length;
        const nextX =
          parentId === ROOT_NODE_ID ? (rootChildCount % 2 === 0 ? 250 : -250) : parentNode.position.x + 250;
        const nextNode: MindMapNode = {
          id: nodeId,
          type: MINDMAP_NODE_TYPE,
          position: {
            x: nextX,
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

        get().applyAutoLayout();

        return nodeId;
      },
      addSiblingNode: (nodeId) => {
        const { nodes, edges } = get();
        const currentNode = nodes.find((node) => node.id === nodeId);
        const parentId = getParentId(nodeId, edges);

        if (!currentNode || !parentId) {
          return null;
        }

        const siblingId = createNodeId();
        const rootChildCount = nodes.filter((node) => getParentId(node.id, edges) === ROOT_NODE_ID).length;
        const nextX =
          parentId === ROOT_NODE_ID ? (rootChildCount % 2 === 0 ? 250 : -250) : currentNode.position.x;
        const nextNode: MindMapNode = {
          id: siblingId,
          type: MINDMAP_NODE_TYPE,
          position: {
            x: nextX,
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

        get().applyAutoLayout();

        return siblingId;
      },
      removeNode: (nodeId) =>
        set((state) => {
          if (nodeId === ROOT_NODE_ID) {
            return state;
          }

          const descendantIds = collectDescendants(nodeId, state.edges);
          const parentId = getParentId(nodeId, state.edges);
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
      moveFocus: (direction) =>
        set((state) => {
          const selectedNode = getSelectedNode(state.nodes);

          if (!selectedNode) {
            return state;
          }

          const nodesById = new Map(state.nodes.map((node) => [node.id, node] as const));
          const nodeOrder = getNodeOrder(state.nodes);
          const parentId = state.edges.find((edge) => edge.target === selectedNode.id)?.source;

          let nextSelectedNode: MindMapNode | undefined;

          switch (direction) {
            case 'left':
              nextSelectedNode = parentId ? nodesById.get(parentId) : undefined;
              break;
            case 'right': {
              const childNodes = state.edges
                .filter((edge) => edge.source === selectedNode.id)
                .map((edge) => nodesById.get(edge.target))
                .filter((node): node is MindMapNode => Boolean(node));

              nextSelectedNode = childNodes.sort(compareByYThenOrder(nodeOrder))[0];
              break;
            }
            case 'up':
            case 'down': {
              if (!parentId) {
                break;
              }

              const siblingNodes = state.edges
                .filter((edge) => edge.source === parentId && edge.target !== selectedNode.id)
                .map((edge) => nodesById.get(edge.target))
                .filter((node): node is MindMapNode => Boolean(node))
                .filter((node) =>
                  direction === 'up' ? node.position.y < selectedNode.position.y : node.position.y > selectedNode.position.y,
                )
                .sort(compareByDistanceThenOrder(selectedNode.position.y, nodeOrder, direction));

              nextSelectedNode = siblingNodes[0];
              break;
            }
          }

          if (!nextSelectedNode) {
            return state;
          }

          return {
            nodes: state.nodes.map((node) => ({
              ...node,
              selected: node.id === nextSelectedNode.id,
            })),
            edges: state.edges,
          };
        }),
      updateNodeParent: (nodeId, newParentId) => {
        set((state) => {
          if (nodeId === ROOT_NODE_ID || nodeId === newParentId) {
            return state;
          }

          const targetNode = state.nodes.find((node) => node.id === nodeId);
          const parentNode = state.nodes.find((node) => node.id === newParentId);

          if (!targetNode || !parentNode) {
            return state;
          }

          const currentParentId = getParentId(nodeId, state.edges);

          if (currentParentId === newParentId) {
            return state;
          }

          if (collectDescendants(nodeId, state.edges).has(newParentId)) {
            return state;
          }

          return {
            nodes: state.nodes,
            edges: [
              ...state.edges.filter((edge) => edge.target !== nodeId),
              {
                id: `${newParentId}-${nodeId}`,
                source: newParentId,
                target: nodeId,
              },
            ],
          };
        });

        get().applyAutoLayout();
      },
      applyAutoLayout: () =>
        set((state) => {
          const rootChildIds = getRootChildIds(state.nodes, state.edges);
          const { right, left } = splitRootChildIds(rootChildIds);
          const rightPositions = buildRadialPositions(state.nodes, right, state.edges, false);
          const leftPositions = buildRadialPositions(state.nodes, left, state.edges, true);
          const positions = new Map<string, XYPosition>([[ROOT_NODE_ID, { x: 0, y: 0 }]]);

          rightPositions.forEach((position, nodeId) => {
            positions.set(nodeId, position);
          });

          leftPositions.forEach((position, nodeId) => {
            positions.set(nodeId, position);
          });

          return {
            nodes: state.nodes.map((node) => ({
              ...node,
              position: positions.get(node.id) ?? node.position,
            })),
            edges: state.edges,
          };
        }),
    }),
    {
      name: 'mindmap-storage',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
