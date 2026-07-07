import { useReactFlow } from '@xyflow/react';
import { useCallback } from 'react';
import { type MindMapEdge, type MindMapNode } from '../store/useStore';

/**
 * 指定したノードIDにビューをフォーカスするカスタムフック。
 * ReactFlow の fitView を requestAnimationFrame で2重にラップし、
 * レイアウト適用後の安定した状態でビューを移動する。
 */
export const useFocusNode = () => {
  const { fitView } = useReactFlow<MindMapNode, MindMapEdge>();

  return useCallback(
    (nodeId: string) => {
      globalThis.requestAnimationFrame(() => {
        globalThis.requestAnimationFrame(() => {
          fitView({
            nodes: [{ id: nodeId }],
            duration: 400,
            maxZoom: 1,
          });
        });
      });
    },
    [fitView],
  );
};
