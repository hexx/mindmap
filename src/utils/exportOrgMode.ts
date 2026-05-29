import {
  createHeading,
  createRoot,
  stringify,
  type Heading,
} from 'org-toolkit';
import { ROOT_NODE_ID, type MindMapEdge, type MindMapNode } from '../store/useStore';

const normalizeLabel = (label: string | undefined) => label?.trim() || '無題';

const buildChildrenMap = (edges: MindMapEdge[]) => {
  const childrenMap = new Map<string, string[]>();

  for (const edge of edges) {
    const children = childrenMap.get(edge.source);

    if (children) {
      children.push(edge.target);
      continue;
    }

    childrenMap.set(edge.source, [edge.target]);
  }

  return childrenMap;
};

const buildHeadings = (
  nodeId: string,
  level: number,
  nodesById: Map<string, MindMapNode>,
  childrenMap: Map<string, string[]>,
  visited: Set<string>,
): Heading[] => {
  if (visited.has(nodeId)) {
    return [];
  }

  const node = nodesById.get(nodeId);

  if (!node) {
    return [];
  }

  visited.add(nodeId);

  const heading = createHeading(level, normalizeLabel(node.data.label));
  const children = childrenMap.get(nodeId) ?? [];

  return [
    heading,
    ...children.flatMap((childId) =>
      buildHeadings(childId, level + 1, nodesById, childrenMap, visited),
    ),
  ];
};

export const exportOrgMode = (nodes: MindMapNode[], edges: MindMapEdge[]) => {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const childrenMap = buildChildrenMap(edges);
  const headings = buildHeadings(ROOT_NODE_ID, 1, nodesById, childrenMap, new Set<string>());

  if (!headings.length) {
    return '';
  }

  const text = stringify(createRoot({}, headings));

  return text.endsWith('\n') ? text : `${text}\n`;
};
