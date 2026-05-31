import { getTextContent, type Heading } from 'org-toolkit';
import { MINDMAP_NODE_TYPE, ROOT_NODE_ID, type MindMapEdge, type MindMapNode } from '../store/useStore';
import { stripOrgModeSideTag } from './orgModeTags';

export type ImportedGraph = {
  nodes: MindMapNode[];
  edges: MindMapEdge[];
};

type ImportStackEntry = {
  level: number;
  id: string;
};

const createRootNode = (): MindMapNode => ({
  id: ROOT_NODE_ID,
  type: MINDMAP_NODE_TYPE,
  position: { x: 0, y: 0 },
  data: { label: 'ルート（中心概念）' },
  selected: true,
  className: 'mindmap-root-node',
});

const normalizeText = (text: string) => text.replace(/\s+/g, ' ').trim();

const headingToLabel = (heading: Heading) => normalizeText(stripOrgModeSideTag(getTextContent(heading))) || '無題';

const getInitialPosition = (heading: Heading) => {
  if (heading.level === 2) {
    return heading.tags.includes('LEFT')
      ? { x: -250, y: 0 }
      : { x: 250, y: 0 };
  }

  return { x: 0, y: 0 };
};

export const buildImportedGraph = (headings: Heading[]): ImportedGraph => {
  const nodes: MindMapNode[] = [createRootNode()];
  const edges: MindMapEdge[] = [];
  const stack: ImportStackEntry[] = [];
  let nextNodeIndex = 0;

  for (const heading of headings) {
    while (stack.length > 0 && stack[stack.length - 1].level >= heading.level) {
      stack.pop();
    }

    const nodeId = `imported-node-${nextNodeIndex++}`;
    const parentId = stack[stack.length - 1]?.id ?? ROOT_NODE_ID;

    nodes.push({
      id: nodeId,
      type: MINDMAP_NODE_TYPE,
      position: getInitialPosition(heading),
      data: {
        label: headingToLabel(heading),
      },
      selected: false,
    });

    edges.push({
      id: `${parentId}-${nodeId}`,
      source: parentId,
      target: nodeId,
    });

    stack.push({
      level: heading.level,
      id: nodeId,
    });
  }

  return {
    nodes,
    edges,
  };
};
