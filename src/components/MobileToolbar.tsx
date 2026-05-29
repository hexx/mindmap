import { useCallback, useMemo } from 'react';
import { getSelectedNode, ROOT_NODE_ID, useStore } from '../store/useStore';

export default function MobileToolbar() {
  const nodes = useStore((state) => state.nodes);
  const addChildNode = useStore((state) => state.addChildNode);
  const addSiblingNode = useStore((state) => state.addSiblingNode);
  const removeNode = useStore((state) => state.removeNode);
  const selectedNode = useMemo(() => getSelectedNode(nodes), [nodes]);

  const handleAddChildNode = useCallback(() => {
    if (!selectedNode) {
      return;
    }

    addChildNode(selectedNode.id);
  }, [addChildNode, selectedNode]);

  const handleAddSiblingNode = useCallback(() => {
    if (!selectedNode) {
      return;
    }

    addSiblingNode(selectedNode.id);
  }, [addSiblingNode, selectedNode]);

  const handleRemoveNode = useCallback(() => {
    if (!selectedNode) {
      return;
    }

    removeNode(selectedNode.id);
  }, [removeNode, selectedNode]);

  const isDisabled = !selectedNode;
  const isRootSelected = selectedNode?.id === ROOT_NODE_ID;

  return (
    <div className="mobile-toolbar" aria-label="モバイル用ノード操作">
      <button type="button" className="mobile-toolbar__button" onClick={handleAddChildNode} disabled={isDisabled}>
        子ノード追加
      </button>
      <button type="button" className="mobile-toolbar__button" onClick={handleAddSiblingNode} disabled={isDisabled}>
        兄弟ノード追加
      </button>
      <button
        type="button"
        className="mobile-toolbar__button mobile-toolbar__button--danger"
        onClick={handleRemoveNode}
        disabled={isDisabled || isRootSelected}
      >
        削除
      </button>
    </div>
  );
}
