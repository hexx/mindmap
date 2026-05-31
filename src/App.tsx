import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  useReactFlow,
  type NodeTypes,
} from '@xyflow/react';
import { useCallback, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import MobileToolbar from './components/MobileToolbar';
import SavedMindmapsModal from './components/SavedMindmapsModal';
import MindMapNodeComponent from './nodes/MindMapNode';
import { importOrgMode } from './utils/importOrgMode';
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
  const importGraph = useStore((state) => state.importGraph);
  const saveToCloud = useStore((state) => state.saveToCloud);
  const moveFocus = useStore((state) => state.moveFocus);
  const updateNodeParent = useStore((state) => state.updateNodeParent);
  const applyAutoLayout = useStore((state) => state.applyAutoLayout);
  const removeNode = useStore((state) => state.removeNode);
  const selectedNode = useMemo(() => getSelectedNode(nodes), [nodes]);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { getIntersectingNodes, fitView } = useReactFlow<MindMapNode, MindMapEdge>();
  const nodeTypes = useMemo<NodeTypes>(
    () => ({
      [MINDMAP_NODE_TYPE]: MindMapNodeComponent,
    }),
    [],
  );

  const focusNode = useCallback(
    (nodeId: string) => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
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

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (!selectedNode) {
        return;
      }

      if (event.key === 'Tab') {
        event.preventDefault();
        const newNodeId = addChildNode(selectedNode.id);

        if (newNodeId) {
          focusNode(newNodeId);
        }

        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        const newNodeId = addSiblingNode(selectedNode.id);

        if (newNodeId) {
          focusNode(newNodeId);
        }

        return;
      }

      if (event.key === 'Backspace' || event.key === 'Delete') {
        event.preventDefault();

        if (selectedNode.id !== ROOT_NODE_ID) {
          removeNode(selectedNode.id);
        }
      }
    },
    [addChildNode, addSiblingNode, focusNode, removeNode, selectedNode],
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

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
  }, [edges, nodes]);

  const handleImportClick = useCallback(() => {
    importInputRef.current?.click();
  }, []);

  const handleSaveToCloud = useCallback(async () => {
    try {
      await saveToCloud();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'クラウドへの保存に失敗しました');
    }
  }, [saveToCloud]);

  const handleOpenCloudMindmaps = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const handleImportFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.currentTarget.files?.[0];
      event.currentTarget.value = '';

      if (!file) {
        return;
      }

      const reader = new FileReader();

      reader.addEventListener('load', () => {
        if (typeof reader.result !== 'string') {
          return;
        }

        const { nodes: importedNodes, edges: importedEdges } = importOrgMode(reader.result);
        importGraph(importedNodes, importedEdges);
      });

      reader.readAsText(file);
    },
    [importGraph],
  );

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
        <button type="button" className="canvas-action-button" onClick={handleSaveToCloud}>
          クラウドに保存
        </button>
        <button type="button" className="canvas-action-button" onClick={handleOpenCloudMindmaps}>
          クラウドから読込
        </button>
        <button type="button" className="canvas-action-button" onClick={handleImportClick}>
          インポート
        </button>
        <button type="button" className="canvas-action-button" onClick={handleExportOrgMode}>
          org-modeでエクスポート
        </button>
      </div>
      <input ref={importInputRef} type="file" accept=".org" onChange={handleImportFileChange} style={{ display: 'none' }} />
      <MobileToolbar />
      <SavedMindmapsModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
