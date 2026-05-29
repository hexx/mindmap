import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type NodeTypes,
} from '@xyflow/react';
import { useMemo } from 'react';
import MindMapNodeComponent from './nodes/MindMapNode';
import { MINDMAP_NODE_TYPE, type MindMapEdge, type MindMapNode, useStore } from './store/useStore';

export default function App() {
  const nodes = useStore((state) => state.nodes);
  const edges = useStore((state) => state.edges);
  const onNodesChange = useStore((state) => state.onNodesChange);
  const onEdgesChange = useStore((state) => state.onEdgesChange);
  const onConnect = useStore((state) => state.onConnect);
  const nodeTypes = useMemo<NodeTypes>(
    () => ({
      [MINDMAP_NODE_TYPE]: MindMapNodeComponent,
    }),
    [],
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
        fitView
        minZoom={0.25}
        className="mindmap-flow"
      >
        <Background />
        <Controls />
        <MiniMap zoomable pannable />
      </ReactFlow>
    </div>
  );
}
