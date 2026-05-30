import { type Edge } from '@xyflow/react';
import { type MindMapNode } from '../store/useStore';

export const LEFT_HANDLE_ID = 'left';
export const RIGHT_HANDLE_ID = 'right';
export const LEFT_SOURCE_HANDLE_ID = 'left-source';
export const LEFT_TARGET_HANDLE_ID = 'left-target';
export const RIGHT_SOURCE_HANDLE_ID = 'right-source';
export const RIGHT_TARGET_HANDLE_ID = 'right-target';

type DirectionalEdge = Pick<Edge, 'sourceHandle' | 'targetHandle'>;

const getDirectionalEdgeHandles = (sourceNode: MindMapNode, targetNode: MindMapNode): DirectionalEdge =>
  targetNode.position.x < sourceNode.position.x
    ? {
        sourceHandle: LEFT_SOURCE_HANDLE_ID,
        targetHandle: RIGHT_TARGET_HANDLE_ID,
      }
    : {
        sourceHandle: RIGHT_SOURCE_HANDLE_ID,
        targetHandle: LEFT_TARGET_HANDLE_ID,
      };

export const createDirectionalEdge = (sourceNode: MindMapNode, targetNode: MindMapNode): Edge => ({
  id: `${sourceNode.id}-${targetNode.id}`,
  source: sourceNode.id,
  target: targetNode.id,
  ...getDirectionalEdgeHandles(sourceNode, targetNode),
});

export const rebuildDirectionalEdges = (nodes: MindMapNode[], edges: Edge[]) => {
  const nodesById = new Map(nodes.map((node) => [node.id, node] as const));

  return edges.map((edge) => {
    const sourceNode = nodesById.get(edge.source);
    const targetNode = nodesById.get(edge.target);

    if (!sourceNode || !targetNode) {
      return edge;
    }

    return {
      ...edge,
      ...getDirectionalEdgeHandles(sourceNode, targetNode),
    };
  });
};
