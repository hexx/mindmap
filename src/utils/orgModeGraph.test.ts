import { describe, expect, it } from 'vitest';
import { exportOrgMode } from './exportOrgMode';
import { importOrgMode } from './importOrgMode';
import { MINDMAP_NODE_TYPE, ROOT_NODE_ID, type MindMapEdge, type MindMapNode } from '../store/useStore';

const createNode = (
  id: string,
  position: MindMapNode['position'],
  label: string,
): MindMapNode => ({
  id,
  type: MINDMAP_NODE_TYPE,
  position,
  data: {
    label,
  },
  selected: false,
});

const createEdge = (source: string, target: string): MindMapEdge => ({
  id: `${source}-${target}`,
  source,
  target,
});

describe('org-mode graph', () => {
  it('round-trips root child side tags through export and import', () => {
    const nodes: MindMapNode[] = [
      createNode(ROOT_NODE_ID, { x: 0, y: 0 }, 'Root'),
      createNode('left-child', { x: -250, y: 0 }, 'Left idea'),
      createNode('right-child', { x: 250, y: 0 }, 'Right idea'),
    ];
    const edges: MindMapEdge[] = [
      createEdge(ROOT_NODE_ID, 'left-child'),
      createEdge(ROOT_NODE_ID, 'right-child'),
    ];

    const exported = exportOrgMode(nodes, edges);

    expect(exported).toContain('Left idea :LEFT:');
    expect(exported).toContain('Right idea :RIGHT:');

    const imported = importOrgMode(exported);
    const importedLeft = imported.nodes.find((node) => node.data.label === 'Left idea');
    const importedRight = imported.nodes.find((node) => node.data.label === 'Right idea');

    expect(importedLeft?.position).toEqual({ x: -250, y: 0 });
    expect(importedRight?.position).toEqual({ x: 250, y: 0 });
    expect(imported.nodes.some((node) => /:(LEFT|RIGHT):/.test(node.data.label))).toBe(false);
  });
});
