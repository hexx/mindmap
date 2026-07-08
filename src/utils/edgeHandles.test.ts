import { describe, expect, it } from 'vitest';
import { type Edge } from '@xyflow/react';
import { type MindMapNode } from '../store/useStore';
import {
  createDirectionalEdge,
  LEFT_SOURCE_HANDLE_ID,
  LEFT_TARGET_HANDLE_ID,
  rebuildDirectionalEdges,
  RIGHT_SOURCE_HANDLE_ID,
  RIGHT_TARGET_HANDLE_ID,
} from './edgeHandles';

const createNode = (id: string, x: number, y: number): MindMapNode => ({
  id,
  type: 'mindmap',
  position: { x, y },
  data: { label: id },
});

describe('createDirectionalEdge', () => {
  it('ターゲットがソースより左 → LEFT_SOURCE + RIGHT_TARGET', () => {
    const source = createNode('src', 200, 0);
    const target = createNode('tgt', 100, 0);

    const edge = createDirectionalEdge(source, target);

    expect(edge.sourceHandle).toBe(LEFT_SOURCE_HANDLE_ID);
    expect(edge.targetHandle).toBe(RIGHT_TARGET_HANDLE_ID);
    expect(edge.id).toBe('src-tgt');
    expect(edge.source).toBe('src');
    expect(edge.target).toBe('tgt');
  });

  it('ターゲットがソースより右 → RIGHT_SOURCE + LEFT_TARGET', () => {
    const source = createNode('src', 100, 0);
    const target = createNode('tgt', 200, 0);

    const edge = createDirectionalEdge(source, target);

    expect(edge.sourceHandle).toBe(RIGHT_SOURCE_HANDLE_ID);
    expect(edge.targetHandle).toBe(LEFT_TARGET_HANDLE_ID);
  });

  it('同一X座標 → 右側扱い（RIGHT_SOURCE + LEFT_TARGET）', () => {
    const source = createNode('src', 100, 0);
    const target = createNode('tgt', 100, 50);

    const edge = createDirectionalEdge(source, target);

    expect(edge.sourceHandle).toBe(RIGHT_SOURCE_HANDLE_ID);
    expect(edge.targetHandle).toBe(LEFT_TARGET_HANDLE_ID);
  });

  it('生成されるエッジIDが sourceId-targetId 形式である', () => {
    const source = createNode('node-a', 0, 0);
    const target = createNode('node-b', 250, 0);

    const edge = createDirectionalEdge(source, target);

    expect(edge.id).toBe('node-a-node-b');
  });
});

describe('rebuildDirectionalEdges', () => {
  it('全エッジのハンドルが再計算される', () => {
    const nodes: MindMapNode[] = [
      createNode('root', 0, 0),
      createNode('left-child', -250, 0),
      createNode('right-child', 250, 0),
    ];
    const edges: Edge[] = [
      { id: 'e1', source: 'root', target: 'left-child' },
      { id: 'e2', source: 'root', target: 'right-child' },
    ];

    const rebuilt = rebuildDirectionalEdges(nodes, edges);

    // 左側の子 → LEFT_SOURCE + RIGHT_TARGET
    expect(rebuilt[0].sourceHandle).toBe(LEFT_SOURCE_HANDLE_ID);
    expect(rebuilt[0].targetHandle).toBe(RIGHT_TARGET_HANDLE_ID);

    // 右側の子 → RIGHT_SOURCE + LEFT_TARGET
    expect(rebuilt[1].sourceHandle).toBe(RIGHT_SOURCE_HANDLE_ID);
    expect(rebuilt[1].targetHandle).toBe(LEFT_TARGET_HANDLE_ID);
  });

  it('存在しないノードIDを含むエッジは元のまま返る', () => {
    const nodes: MindMapNode[] = [createNode('root', 0, 0)];
    const edges: Edge[] = [
      { id: 'e1', source: 'root', target: 'ghost' },
    ];

    const rebuilt = rebuildDirectionalEdges(nodes, edges);

    // 元のエッジがそのまま（破壊されない）
    expect(rebuilt[0]).toEqual(edges[0]);
  });

  it('空のエッジ配列はそのまま空で返る', () => {
    const nodes: MindMapNode[] = [createNode('root', 0, 0)];

    const rebuilt = rebuildDirectionalEdges(nodes, []);

    expect(rebuilt).toHaveLength(0);
  });
});
