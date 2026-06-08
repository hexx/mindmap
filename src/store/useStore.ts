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
import { createDirectionalEdge, rebuildDirectionalEdges } from '../utils/edgeHandles';
import {
  client,
  type CloudMindmapRecord,
  type CloudMindmapSummary,
} from '../utils/cloudMindmaps';

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
  cloudMindmaps: CloudMindmapSummary[];
  currentCloudMindmapId: string | null;
  setNodes: (nodes: MindMapNode[]) => void;
  setEdges: (edges: MindMapEdge[]) => void;
  resetGraph: () => void;
  onNodesChange: (changes: NodeChange<MindMapNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<MindMapEdge>[]) => void;
  onConnect: (connection: Connection) => void;
  addNode: (input: CreateNodeInput) => string;
  addChildNode: (parentId: string) => string | null;
  addSiblingNode: (nodeId: string) => string | null;
  importGraph: (nodes: MindMapNode[], edges: MindMapEdge[]) => void;
  removeNode: (nodeId: string) => void;
  updateNodeLabel: (nodeId: string, label: string) => void;
  moveFocus: (direction: FocusDirection) => void;
  updateNodeParent: (nodeId: string, newParentId: string) => void;
  applyAutoLayout: () => void;
  fetchCloudMindmaps: () => Promise<void>;
  deleteFromCloud: (id: string) => Promise<void>;
  loadFromCloud: (id: string) => Promise<void>;
  saveToCloud: () => Promise<void>;
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

const createInitialState = () => ({
  ...createInitialGraph(),
  cloudMindmaps: [] as CloudMindmapSummary[],
  currentCloudMindmapId: null as string | null,
});

const getCloudMindmapTitle = (nodes: MindMapNode[]) => nodes.find((node) => node.id === ROOT_NODE_ID)?.data.label.trim() || '無題のマインドマップ';

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
    .toSorted((left, right) => (nodeOrder.get(left.id) ?? 0) - (nodeOrder.get(right.id) ?? 0))
    .map((node) => node.id);
};

const splitRootChildIds = (nodes: MindMapNode[], rootChildIds: string[]) => {
  const rootChildNodes = rootChildIds
    .map((nodeId) => nodes.find((node) => node.id === nodeId))
    .filter((node): node is MindMapNode => Boolean(node));
  const hasManualSideSelection = rootChildNodes.some((node) => Math.abs(node.position.x) > 1);

  if (hasManualSideSelection) {
    return rootChildNodes.reduce(
      (groups, node) => {
        const targetGroup = node.position.x < 0 ? groups.left : groups.right;
        targetGroup.push(node.id);
        return groups;
      },
      {
        right: [] as string[],
        left: [] as string[],
      },
    );
  }

  return rootChildIds.reduce(
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
};

const getChildOffset = (parentNode: MindMapNode) => (parentNode.position.x < 0 ? -250 : 250);

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
      .toSorted((left, right) => (nodeOrder.get(left) ?? 0) - (nodeOrder.get(right) ?? 0))
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
      ...createInitialState(),
      setNodes: (nodes) => set({ nodes }),
      setEdges: (edges) => set({ edges }),
      resetGraph: () =>
        set((state) => ({
          ...createInitialGraph(),
          cloudMindmaps: state.cloudMindmaps,
          currentCloudMindmapId: null,
        })),
      onNodesChange: (changes) =>
        set((state) => {
          const nextNodes = applyNodeChanges(changes, state.nodes);

          return {
            nodes: nextNodes,
            edges: rebuildDirectionalEdges(nextNodes, state.edges),
          };
        }),
      onEdgesChange: (changes) =>
        set((state) => ({
          edges: applyEdgeChanges(changes, state.edges),
        })),
      onConnect: (connection) =>
        set((state) => {
          const sourceNode = state.nodes.find((node) => node.id === connection.source);
          const targetNode = state.nodes.find((node) => node.id === connection.target);

          if (!sourceNode || !targetNode) {
            return {
              edges: addEdge(connection, state.edges),
            };
          }

          return {
            edges: addEdge(
              {
                ...connection,
                ...createDirectionalEdge(sourceNode, targetNode),
              },
              state.edges,
            ),
          };
        }),
      addNode: ({ data, position, parentId, id }) => {
        const nodeId = id ?? createNodeId();
        const parentNode = parentId ? get().nodes.find((node) => node.id === parentId) : undefined;

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

          const nextEdges = parentId && parentNode
            ? [
                ...state.edges,
                createDirectionalEdge(parentNode, nextNode),
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
        const nextX = parentId === ROOT_NODE_ID ? 250 : parentNode.position.x + getChildOffset(parentNode);
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
            createDirectionalEdge(parentNode, nextNode),
          ],
        });

        get().applyAutoLayout();

        return nodeId;
      },
      addSiblingNode: (nodeId) => {
        const { nodes, edges } = get();
        const currentNode = nodes.find((node) => node.id === nodeId);
        const parentId = getParentId(nodeId, edges);
        const parentNode = nodes.find((node) => node.id === parentId);

        if (!currentNode || !parentId || !parentNode) {
          return null;
        }

        const siblingId = createNodeId();
        const nextX = parentId === ROOT_NODE_ID ? (currentNode.position.x < 0 ? -250 : 250) : currentNode.position.x;
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
            createDirectionalEdge(parentNode, nextNode),
          ],
        });

        get().applyAutoLayout();

        return siblingId;
      },
      importGraph: (nodes, edges) => {
        const nextNodes = nodes.map((node) => ({
          ...node,
          selected: node.id === ROOT_NODE_ID,
        }));
        const nextEdges = rebuildDirectionalEdges(nextNodes, edges);

        set({
          nodes: nextNodes,
          edges: nextEdges,
          currentCloudMindmapId: null,
        });

        get().applyAutoLayout();
      },
      fetchCloudMindmaps: async () => {
        const response = await client.api.mindmaps.$get();

        if (!response.ok) {
          throw new Error(`クラウド一覧の取得に失敗しました: ${response.status}`);
        }

        const cloudMindmaps: CloudMindmapSummary[] = await response.json();

        set({
          cloudMindmaps,
        });
      },
      deleteFromCloud: async (id) => {
        const response = await client.api.mindmap[':id'].$delete({
          param: {
            id,
          },
        });

        if (!response.ok) {
          throw new Error(`クラウドからの削除に失敗しました: ${response.status}`);
        }

        set((state) => ({
          currentCloudMindmapId: state.currentCloudMindmapId === id ? null : state.currentCloudMindmapId,
        }));

        await get().fetchCloudMindmaps();
      },
      loadFromCloud: async (id) => {
        const response = await client.api.mindmap[':id'].$get({
          param: {
            id,
          },
        });

        if (!response.ok) {
          throw new Error(`クラウドからの読み込みに失敗しました: ${response.status}`);
        }

        const record: CloudMindmapRecord = await response.json();

        get().importGraph(record.nodes, record.edges);
        set({
          currentCloudMindmapId: record.id,
        });
      },
      saveToCloud: async () => {
        const { currentCloudMindmapId, edges, nodes } = get();
        const payload = {
          title: getCloudMindmapTitle(nodes),
          nodes,
          edges,
        };

        const requestPayload = currentCloudMindmapId
          ? {
              ...payload,
              id: currentCloudMindmapId,
            }
          : payload;

        const response = currentCloudMindmapId
          ? await client.api.mindmap[':id'].$put({
              param: {
                id: currentCloudMindmapId,
              },
              json: requestPayload,
            })
          : await client.api.mindmap.$post({
              json: requestPayload,
            });

        if (!response.ok) {
          throw new Error(`クラウドへの保存に失敗しました: ${response.status}`);
        }

        const savedMindmap: CloudMindmapSummary = await response.json();

        set({
          currentCloudMindmapId: savedMindmap.id,
        });

        await get().fetchCloudMindmaps();
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

              nextSelectedNode = childNodes.toSorted(compareByYThenOrder(nodeOrder))[0];
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
                .toSorted(compareByDistanceThenOrder(selectedNode.position.y, nodeOrder, direction));

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
              createDirectionalEdge(parentNode, targetNode),
            ],
          };
        });

        get().applyAutoLayout();
      },
      applyAutoLayout: () =>
        set((state) => {
          const rootChildIds = getRootChildIds(state.nodes, state.edges);
          const { right, left } = splitRootChildIds(state.nodes, rootChildIds);
          const rightPositions = buildRadialPositions(state.nodes, right, state.edges, false);
          const leftPositions = buildRadialPositions(state.nodes, left, state.edges, true);
          const positions = new Map<string, XYPosition>([[ROOT_NODE_ID, { x: 0, y: 0 }]]);

          rightPositions.forEach((position, nodeId) => {
            positions.set(nodeId, position);
          });

          leftPositions.forEach((position, nodeId) => {
            positions.set(nodeId, position);
          });

          const nextNodes = state.nodes.map((node) => ({
            ...node,
            position: positions.get(node.id) ?? node.position,
          }));

          return {
            nodes: nextNodes,
            edges: rebuildDirectionalEdges(nextNodes, state.edges),
          };
        }),
    }),
    {
      name: 'mindmap-storage',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
