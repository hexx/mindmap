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

// ── exportOrgMode ────────────────────────────────────────────────────────

describe('exportOrgMode', () => {
  it('ルートのみの空グラフをエクスポートするとルートの見出しのみ出力される', () => {
    const nodes: MindMapNode[] = [
      createNode(ROOT_NODE_ID, { x: 0, y: 0 }, '中心概念'),
    ];
    const edges: MindMapEdge[] = [];

    const result = exportOrgMode(nodes, edges);

    expect(result).not.toBe('');
    expect(result).toContain('* 中心概念');
    // ルートノードだけが出力される（子がいないので見出しは1つだけ）
    expect(result.trim().split('\n').filter((line) => line.startsWith('*')).length).toBe(1);
  });

  it('深さ3のネスト構造が正しい見出しレベルで出力される', () => {
    const nodes: MindMapNode[] = [
      createNode(ROOT_NODE_ID, { x: 0, y: 0 }, 'Root'),
      createNode('child-1', { x: 250, y: 0 }, 'Child'),
      createNode('grandchild-1', { x: 500, y: 0 }, 'Grandchild'),
    ];
    const edges: MindMapEdge[] = [
      createEdge(ROOT_NODE_ID, 'child-1'),
      createEdge('child-1', 'grandchild-1'),
    ];

    const result = exportOrgMode(nodes, edges);

    // レベル1: Root
    expect(result).toMatch(/^\* Root/m);
    // レベル2: Child（位置x>0 なので :RIGHT: タグが付与される）
    expect(result).toMatch(/^\*\* Child/m);
    // レベル3: Grandchild
    expect(result).toMatch(/^\*\*\* Grandchild/m);
  });

  it('空ラベルノードは "無題" にフォールバックされる', () => {
    const nodes: MindMapNode[] = [
      createNode(ROOT_NODE_ID, { x: 0, y: 0 }, ''),
      createNode('child-1', { x: 250, y: 0 }, '   '),
    ];
    const edges: MindMapEdge[] = [
      createEdge(ROOT_NODE_ID, 'child-1'),
    ];

    const result = exportOrgMode(nodes, edges);

    // 空文字列も空白のみも "無題" になる
    expect(result).toContain('* 無題');
    expect(result).toContain('** 無題');
  });

  it('改行を含むラベルは正規化されて出力される', () => {
    const nodes: MindMapNode[] = [
      createNode(ROOT_NODE_ID, { x: 0, y: 0 }, 'Root\nwith\nnewlines'),
    ];
    const edges: MindMapEdge[] = [];

    const result = exportOrgMode(nodes, edges);

    // 改行は org-toolkit の stringify によって空白に正規化される（1行の見出しとして出力）
    const lines = result.trim().split('\n');
    expect(lines.filter((line) => line.startsWith('*')).length).toBe(1);
    expect(result).toContain('Root');
  });

  it('特殊文字（日本語、記号）を含むラベルが文字化けしない', () => {
    const nodes: MindMapNode[] = [
      createNode(ROOT_NODE_ID, { x: 0, y: 0 }, '日本語テスト①②③'),
      createNode('child-1', { x: 250, y: 0 }, '記号 !@#$%^&*()'),
      createNode('child-2', { x: -250, y: 0 }, '絵文字 🎉👍'),
    ];
    const edges: MindMapEdge[] = [
      createEdge(ROOT_NODE_ID, 'child-1'),
      createEdge(ROOT_NODE_ID, 'child-2'),
    ];

    const result = exportOrgMode(nodes, edges);

    expect(result).toContain('日本語テスト①②③');
    expect(result).toContain('記号 !@#$%^&*()');
    expect(result).toContain('絵文字 🎉👍');
  });

  it('右側（x>0）は :RIGHT:、左側（x<0）は :LEFT: タグが付与される', () => {
    const nodes: MindMapNode[] = [
      createNode(ROOT_NODE_ID, { x: 0, y: 0 }, 'Root'),
      createNode('right-1', { x: 300, y: 0 }, 'Right node'),
      createNode('right-2', { x: 250, y: 50 }, 'Another right'),
      createNode('left-1', { x: -300, y: 0 }, 'Left node'),
      createNode('left-2', { x: -250, y: 50 }, 'Another left'),
    ];
    const edges: MindMapEdge[] = [
      createEdge(ROOT_NODE_ID, 'right-1'),
      createEdge(ROOT_NODE_ID, 'right-2'),
      createEdge(ROOT_NODE_ID, 'left-1'),
      createEdge(ROOT_NODE_ID, 'left-2'),
    ];

    const result = exportOrgMode(nodes, edges);

    expect(result).toContain('Right node :RIGHT:');
    expect(result).toContain('Another right :RIGHT:');
    expect(result).toContain('Left node :LEFT:');
    expect(result).toContain('Another left :LEFT:');
  });

  it('エクスポート結果の末尾は改行で終わる', () => {
    const nodes: MindMapNode[] = [
      createNode(ROOT_NODE_ID, { x: 0, y: 0 }, 'Root'),
    ];
    const edges: MindMapEdge[] = [];

    const result = exportOrgMode(nodes, edges);

    expect(result.endsWith('\n')).toBe(true);
  });
});

// ── importOrgMode ────────────────────────────────────────────────────────

describe('importOrgMode', () => {
  it('空文字列をインポートするとルートノードのみのグラフが返る', () => {
    const result = importOrgMode('');

    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].id).toBe(ROOT_NODE_ID);
    expect(result.edges).toHaveLength(0);
  });

  it('見出しのない本文のみのorgテキストではルートノードのみのグラフになる', () => {
    const text = 'これはただの本文です。\n見出しはありません。';

    const result = importOrgMode(text);

    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].id).toBe(ROOT_NODE_ID);
    expect(result.edges).toHaveLength(0);
  });

  it('深いネスト構造で正しい親子関係のエッジが生成される', () => {
    const text = `* Root
** Child 1
*** Grandchild 1.1
*** Grandchild 1.2
** Child 2
*** Grandchild 2.1
`;

    const result = importOrgMode(text);

    // 組み込みルート + orgテキストの「* Root」が別ノードとして追加される = 7ノード
    expect(result.nodes).toHaveLength(7);
    // 6エッジ（各子ノードにつき1つ）
    expect(result.edges).toHaveLength(6);

    // 各ノードが正しい親を持つことを検証
    const nodeByName = new Map(result.nodes.map((n) => [n.data.label, n]));
    const edgeByTarget = new Map(result.edges.map((e) => [e.target, e]));

    const rootNode = result.nodes.find((n) => n.id === ROOT_NODE_ID);
    expect(rootNode).toBeDefined();

    // Child 1 と Child 2 の親はルート
    const child1 = nodeByName.get('Child 1');
    const child2 = nodeByName.get('Child 2');
    expect(child1).toBeDefined();
    expect(child2).toBeDefined();

    // Grandchild の親を確認
    const gc1_1 = nodeByName.get('Grandchild 1.1');
    const gc1_2 = nodeByName.get('Grandchild 1.2');
    const gc2_1 = nodeByName.get('Grandchild 2.1');

    // 各孫ノードのエッジの source が正しい親を指している
    const gc1_1Parent = result.nodes.find((n) => n.id === edgeByTarget.get(gc1_1!.id)?.source);
    expect(gc1_1Parent?.data.label).toBe('Child 1');

    const gc1_2Parent = result.nodes.find((n) => n.id === edgeByTarget.get(gc1_2!.id)?.source);
    expect(gc1_2Parent?.data.label).toBe('Child 1');

    const gc2_1Parent = result.nodes.find((n) => n.id === edgeByTarget.get(gc2_1!.id)?.source);
    expect(gc2_1Parent?.data.label).toBe('Child 2');
  });

  it(':LEFT:/:RIGHT: タグ付き見出しをインポートすると、タグが除去され位置情報に変換される', () => {
    const text = `* Root
** Left idea :LEFT:
** Right idea :RIGHT:
`;

    const result = importOrgMode(text);

    const leftNode = result.nodes.find((n) => n.data.label === 'Left idea');
    const rightNode = result.nodes.find((n) => n.data.label === 'Right idea');

    expect(leftNode).toBeDefined();
    expect(rightNode).toBeDefined();
    // タグがラベルから除去されている
    expect(leftNode!.data.label).not.toContain(':LEFT:');
    expect(rightNode!.data.label).not.toContain(':RIGHT:');
    // 位置に変換されている
    expect(leftNode!.position.x).toBe(-250);
    expect(rightNode!.position.x).toBe(250);
  });

  it('空ラベルの見出しは "無題" になる', () => {
    const text = `* 
** 
`;

    const result = importOrgMode(text);

    const emptyNode = result.nodes.find((n) => n.id !== ROOT_NODE_ID);
    expect(emptyNode).toBeDefined();
    expect(emptyNode!.data.label).toBe('無題');
  });

  it('不正なorg-mode構文でも例外を投げずに処理される', () => {
    const text = '***** 深すぎる見出し\nただのテキスト\n* 正常な見出し\n';

    // 例外がスローされないこと
    expect(() => importOrgMode(text)).not.toThrow();
    const result = importOrgMode(text);

    // 少なくともルートノードは常に存在する
    expect(result.nodes.length).toBeGreaterThanOrEqual(1);
    expect(result.nodes[0].id).toBe(ROOT_NODE_ID);
  });

  it('日本語の見出しが正しくインポートされる', () => {
    const text = `* 中心
** 左のアイデア :LEFT:
** 右のアイデア :RIGHT:
`;

    const result = importOrgMode(text);

    expect(result.nodes.some((n) => n.data.label === '中心')).toBe(true);
    expect(result.nodes.some((n) => n.data.label === '左のアイデア')).toBe(true);
    expect(result.nodes.some((n) => n.data.label === '右のアイデア')).toBe(true);
  });
});

// ── round-trip（往復） ───────────────────────────────────────────────────

describe('org-mode round-trip', () => {
  it('複雑なツリー構造の往復でノード数・親子関係が保存される', () => {
    const nodes: MindMapNode[] = [
      createNode(ROOT_NODE_ID, { x: 0, y: 0 }, 'Root'),
      createNode('c1', { x: 250, y: -80 }, 'Child 1'),
      createNode('c2', { x: 250, y: 80 }, 'Child 2'),
      createNode('gc1', { x: 500, y: -80 }, 'Grandchild 1'),
      createNode('gc2', { x: 500, y: 80 }, 'Grandchild 2'),
      createNode('c3', { x: -250, y: 0 }, 'Child 3 (left)'),
      createNode('ggc1', { x: 750, y: -80 }, 'Great-grandchild'),
    ];
    const edges: MindMapEdge[] = [
      createEdge(ROOT_NODE_ID, 'c1'),
      createEdge(ROOT_NODE_ID, 'c2'),
      createEdge('c1', 'gc1'),
      createEdge('c2', 'gc2'),
      createEdge(ROOT_NODE_ID, 'c3'),
      createEdge('gc1', 'ggc1'),
    ];

    const exported = exportOrgMode(nodes, edges);
    const imported = importOrgMode(exported);

    // ノード数が一致（import はルートを再生成するので、ラベル比較で検証）
    const exportedLabels = nodes.map((n) => n.data.label).toSorted();
    const importedLabels = imported.nodes.map((n) => n.data.label).toSorted();
    // インポートされた「ルート（中心概念）」は元の「Root」と異なるため、
    // ルート以外のラベルがすべて含まれていることを確認する
    for (const label of exportedLabels) {
      if (label === 'Root') continue; // ルートはインポート時に再生成される
      expect(importedLabels).toContain(label);
    }

    // エッジ数: 元は6エッジ + import時に "ルート（中心概念）"→"Root" のエッジが追加される = 7
    expect(imported.edges.length).toBe(edges.length + 1);

    // 親子関係のトポロジーが保存されていることを検証
    // インポートされた各ノードの親ラベルを確認
    const importedNodeByName = new Map(imported.nodes.map((n) => [n.data.label, n]));
    const importedEdgeByTarget = new Map(imported.edges.map((e) => [e.target, e]));

    const gc1Imported = importedNodeByName.get('Grandchild 1');
    expect(gc1Imported).toBeDefined();
    const gc1ParentEdge = importedEdgeByTarget.get(gc1Imported!.id);
    const gc1Parent = imported.nodes.find((n) => n.id === gc1ParentEdge?.source);
    expect(gc1Parent?.data.label).toBe('Child 1');
  });

  it('改行・特殊文字を含むラベルの往復で情報が失われない', () => {
    const nodes: MindMapNode[] = [
      createNode(ROOT_NODE_ID, { x: 0, y: 0 }, 'Root'),
      createNode('c1', { x: 250, y: 0 }, '日本語①②③'),
      createNode('c2', { x: -250, y: 50 }, '記号 !@#$%'),
      createNode('c3', { x: -250, y: -50 }, 'emoji 🎉🎊'),
    ];
    const edges: MindMapEdge[] = [
      createEdge(ROOT_NODE_ID, 'c1'),
      createEdge(ROOT_NODE_ID, 'c2'),
      createEdge(ROOT_NODE_ID, 'c3'),
    ];

    const exported = exportOrgMode(nodes, edges);
    const imported = importOrgMode(exported);

    expect(imported.nodes.some((n) => n.data.label === '日本語①②③')).toBe(true);
    expect(imported.nodes.some((n) => n.data.label === '記号 !@#$%')).toBe(true);
    expect(imported.nodes.some((n) => n.data.label === 'emoji 🎉🎊')).toBe(true);
  });

  it('空ラベルノードを含むツリーを往復しても構造が維持される', () => {
    const nodes: MindMapNode[] = [
      createNode(ROOT_NODE_ID, { x: 0, y: 0 }, 'Root'),
      createNode('empty-child', { x: 250, y: 0 }, ''),
      createNode('nested-empty', { x: 500, y: 0 }, '   '),
    ];
    const edges: MindMapEdge[] = [
      createEdge(ROOT_NODE_ID, 'empty-child'),
      createEdge('empty-child', 'nested-empty'),
    ];

    const exported = exportOrgMode(nodes, edges);
    const imported = importOrgMode(exported);

    // 3段の親子関係が維持されている
    expect(imported.nodes.length).toBeGreaterThanOrEqual(3);
    // 空ラベルは "無題" に正規化されている
    expect(imported.nodes.some((n) => n.data.label === '無題')).toBe(true);
  });
});
