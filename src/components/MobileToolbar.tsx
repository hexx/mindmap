import { useCallback, useMemo, type PointerEvent } from 'react';
import { useReactFlow } from '@xyflow/react';
import { Plus, GitBranch, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSelectedNode, ROOT_NODE_ID, type MindMapEdge, type MindMapNode, useStore } from '@/store/useStore';

export default function MobileToolbar() {
  const nodes = useStore((state) => state.nodes);
  const addChildNode = useStore((state) => state.addChildNode);
  const addSiblingNode = useStore((state) => state.addSiblingNode);
  const removeNode = useStore((state) => state.removeNode);
  const selectedNode = useMemo(() => getSelectedNode(nodes), [nodes]);
  const { fitView } = useReactFlow<MindMapNode, MindMapEdge>();

  const focusNode = useCallback(
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

  const handleAddChildNode = useCallback((event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (!selectedNode) {
      return;
    }

    const newNodeId = addChildNode(selectedNode.id);

    if (newNodeId) {
      focusNode(newNodeId);
    }
  }, [addChildNode, focusNode, selectedNode]);

  const handleAddSiblingNode = useCallback((event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (!selectedNode) {
      return;
    }

    const newNodeId = addSiblingNode(selectedNode.id);

    if (newNodeId) {
      focusNode(newNodeId);
    }
  }, [addSiblingNode, focusNode, selectedNode]);

  const handleRemoveNode = useCallback((event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (!selectedNode) {
      return;
    }

    removeNode(selectedNode.id);
  }, [removeNode, selectedNode]);

  const isDisabled = !selectedNode;
  const isRootSelected = selectedNode?.id === ROOT_NODE_ID;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 z-30 flex gap-2 rounded-2xl border bg-background/95 p-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden"
      aria-label="モバイル用ノード操作"
    >
      <Button
        variant="outline"
        className="flex-1"
        onPointerDown={handleAddChildNode}
        disabled={isDisabled}
      >
        <Plus className="mr-2 size-4" />
        子ノード追加
      </Button>
      <Button
        variant="outline"
        className="flex-1"
        onPointerDown={handleAddSiblingNode}
        disabled={isDisabled || isRootSelected}
      >
        <GitBranch className="mr-2 size-4" />
        兄弟ノード追加
      </Button>
      <Button
        variant="destructive"
        className="flex-1"
        onPointerDown={handleRemoveNode}
        disabled={isDisabled || isRootSelected}
      >
        <Trash2 className="mr-2 size-4" />
        削除
      </Button>
    </div>
  );
}
