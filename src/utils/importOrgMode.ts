import { parse, type Heading } from 'org-toolkit';
import { buildImportedGraph, type ImportedGraph } from './orgModeGraph';

export const importOrgMode = (text: string): ImportedGraph => {
  const ast = parse(text);
  const headings = ast.children.filter((child): child is Heading => child.type === 'heading');

  return buildImportedGraph(headings);
};
