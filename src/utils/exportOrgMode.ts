import { ROOT_NODE_ID, type MindMapEdge, type MindMapNode } from '../store/useStore';

export type OrgModeTreeNode = {
  id: string;
  label: string;
  children: OrgModeTreeNode[];
};

const normalizeLabel = (label: string | undefined) => label?.trim() || '無題';

const buildChildrenMap = (edges: MindMapEdge[]) => {
  const childrenMap = new Map<string, string[]>();

  for (const edge of edges) {
    const targets = childrenMap.get(edge.source);

    if (targets) {
      targets.push(edge.target);
      continue;
    }

    childrenMap.set(edge.source, [edge.target]);
  }

  return childrenMap;
};

const buildTreeNode = (
  nodeId: string,
  nodesById: Map<string, MindMapNode>,
  childrenMap: Map<string, string[]>,
  visited: Set<string>,
): OrgModeTreeNode | null => {
  if (visited.has(nodeId)) {
    return null;
  }

  const node = nodesById.get(nodeId);

  if (!node) {
    return null;
  }

  visited.add(nodeId);

  const children = (childrenMap.get(nodeId) ?? [])
    .map((childId) => buildTreeNode(childId, nodesById, childrenMap, visited))
    .filter((child): child is OrgModeTreeNode => child !== null);

  return {
    id: nodeId,
    label: normalizeLabel(node.data.label),
    children,
  };
};

export const buildOrgModeTree = (
  nodes: MindMapNode[],
  edges: MindMapEdge[],
): OrgModeTreeNode | null => {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const childrenMap = buildChildrenMap(edges);

  return buildTreeNode(ROOT_NODE_ID, nodesById, childrenMap, new Set<string>());
};

export const serializeOrgModeTree = (tree: OrgModeTreeNode) => {
  const lines: string[] = [];

  const walk = (node: OrgModeTreeNode, depth: number) => {
    lines.push(`${'*'.repeat(depth)} ${node.label}`);

    for (const child of node.children) {
      walk(child, depth + 1);
    }
  };

  walk(tree, 1);

  return `${lines.join('\n')}\n`;
};

export const exportOrgMode = (nodes: MindMapNode[], edges: MindMapEdge[]) => {
  const tree = buildOrgModeTree(nodes, edges);

  if (!tree) {
    return '';
  }

  return serializeOrgModeTree(tree);
};
