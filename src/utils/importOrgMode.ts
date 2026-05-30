import { parse, type Heading, type InlineNode } from 'org-toolkit';
import { MINDMAP_NODE_TYPE, ROOT_NODE_ID, type MindMapEdge, type MindMapNode } from '../store/useStore';

type ImportedGraph = {
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

const inlineNodeToText = (node: InlineNode): string => {
  switch (node.type) {
    case 'text':
    case 'code':
    case 'verbatim':
      return node.value;
    case 'bold':
    case 'italic':
    case 'underline':
    case 'strike-through':
      return node.children.map(inlineNodeToText).join('');
    case 'link':
      return node.description?.map(inlineNodeToText).join('') ?? node.url;
    case 'footnote-reference':
      return node.label;
    case 'timestamp': {
      const date = `${node.year}-${String(node.month).padStart(2, '0')}-${String(node.day).padStart(2, '0')}`;
      return node.time ? `${date} ${node.time}` : date;
    }
    default:
      return '';
  }
};

const headingToLabel = (heading: Heading) => {
  const text = heading.children.map(inlineNodeToText).join('');
  return normalizeText(text) || '無題';
};

export const importOrgMode = (text: string): ImportedGraph => {
  const ast = parse(text);
  const nodes: MindMapNode[] = [createRootNode()];
  const edges: MindMapEdge[] = [];
  const stack: ImportStackEntry[] = [];
  let nextNodeIndex = 0;

  for (const child of ast.children) {
    if (child.type !== 'heading') {
      continue;
    }

    while (stack.length > 0 && stack[stack.length - 1].level >= child.level) {
      stack.pop();
    }

    const nodeId = `imported-node-${nextNodeIndex++}`;
    const parentId = stack[stack.length - 1]?.id ?? ROOT_NODE_ID;

    nodes.push({
      id: nodeId,
      type: MINDMAP_NODE_TYPE,
      position: { x: 0, y: 0 },
      data: {
        label: headingToLabel(child),
      },
      selected: false,
    });

    edges.push({
      id: `${parentId}-${nodeId}`,
      source: parentId,
      target: nodeId,
    });

    stack.push({
      level: child.level,
      id: nodeId,
    });
  }

  return {
    nodes,
    edges,
  };
};
