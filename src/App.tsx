import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  useReactFlow,
  type NodeTypes,
} from '@xyflow/react';
import { useCallback, useMemo, type KeyboardEvent } from 'react';
import MobileToolbar from './components/MobileToolbar';
import MindMapNodeComponent from './nodes/MindMapNode';
import { exportOrgMode } from './utils/exportOrgMode';
import {
  MINDMAP_NODE_TYPE,
  ROOT_NODE_ID,
  getSelectedNode,
  type MindMapEdge,
  type MindMapNode,
  useStore,
} from './store/useStore';

export default function App() {
  const nodes = useStore((state) => state.nodes);
  const edges = useStore((state) => state.edges);
  const onNodesChange = useStore((state) => state.onNodesChange);
  const onEdgesChange = useStore((state) => state.onEdgesChange);
  const onConnect = useStore((state) => state.onConnect);
  const addChildNode = useStore((state) => state.addChildNode);
  const addSiblingNode = useStore((state) => state.addSiblingNode);
  const moveFocus = useStore((state) => state.moveFocus);
  const updateNodeParent = useStore((state) => state.updateNodeParent);
  const applyAutoLayout = useStore((state) => state.applyAutoLayout);
  const removeNode = useStore((state) => state.removeNode);
  const selectedNode = useMemo(() => getSelectedNode(nodes), [nodes]);
  const { getIntersectingNodes } = useReactFlow<MindMapNode, MindMapEdge>();
  const nodeTypes = useMemo<NodeTypes>(
    () => ({
      [MINDMAP_NODE_TYPE]: MindMapNodeComponent,
    }),
    [],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (!selectedNode) {
        return;
      }

      if (event.key === 'Tab') {
        event.preventDefault();
        addChildNode(selectedNode.id);
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        addSiblingNode(selectedNode.id);
        return;
      }

      if (event.key === 'Backspace' || event.key === 'Delete') {
        event.preventDefault();

        if (selectedNode.id !== ROOT_NODE_ID) {
          removeNode(selectedNode.id);
        }
      }
    },
    [addChildNode, addSiblingNode, removeNode, selectedNode],
  );

  const handleKeyDownCapture = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        event.stopPropagation();
        moveFocus('up');
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        event.stopPropagation();
        moveFocus('down');
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        event.stopPropagation();
        moveFocus('left');
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        event.stopPropagation();
        moveFocus('right');
        return;
      }
    },
    [moveFocus],
  );

  const handleExportOrgMode = useCallback(() => {
    const content = exportOrgMode(nodes, edges);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const downloadUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = downloadUrl;
    anchor.download = 'mindmap.org';
    anchor.style.display = 'none';

    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
  }, [edges, nodes]);

  return (
    <div className="app-shell">
      <ReactFlow<MindMapNode, MindMapEdge>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={(_, node) => {
          const intersectingNodes = getIntersectingNodes(node, true).filter((candidate) => candidate.id !== node.id);
          const nextParentNode = intersectingNodes[0];

          if (!nextParentNode) {
            return;
          }

          updateNodeParent(node.id, nextParentNode.id);
        }}
        onKeyDownCapture={handleKeyDownCapture}
        onKeyDown={handleKeyDown}
        deleteKeyCode={null}
        fitView
        minZoom={0.25}
        className="mindmap-flow"
      >
        <Background />
        <Controls />
        <MiniMap zoomable pannable />
      </ReactFlow>
      <div className="canvas-actions">
        <button type="button" className="canvas-action-button" onClick={applyAutoLayout}>
          整列
        </button>
        <button type="button" className="canvas-action-button" onClick={handleExportOrgMode}>
          org-modeでエクスポート
        </button>
      </div>
      <MobileToolbar />
    </div>
  );
}
