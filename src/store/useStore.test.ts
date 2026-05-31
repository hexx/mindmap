import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDirectionalEdge } from '../utils/edgeHandles';
import { client } from '../utils/cloudMindmaps';
import {
  MINDMAP_NODE_TYPE,
  ROOT_NODE_ID,
  type MindMapEdge,
  type MindMapNode,
  useStore,
} from './useStore';

vi.mock('../utils/cloudMindmaps', () => ({
  client: {
    api: {
      mindmaps: {
        $get: vi.fn(),
      },
      mindmap: {
        $post: vi.fn(),
        ':id': {
          $get: vi.fn(),
          $put: vi.fn(),
          $delete: vi.fn(),
        },
      },
    },
  },
}));

const createNode = (
  id: string,
  position: MindMapNode['position'],
  selected = false,
  label = id,
): MindMapNode => ({
  id,
  type: MINDMAP_NODE_TYPE,
  position,
  data: {
    label,
  },
  selected,
});

const getSelectedNodeId = () => useStore.getState().nodes.find((node) => node.selected)?.id;

describe('useStoreのテスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    useStore.setState(useStore.getInitialState(), true);
  });

  it('starts with only the root node', () => {
    const { edges, nodes } = useStore.getState();

    expect(nodes).toHaveLength(1);
    expect(nodes[0]).toMatchObject({
      id: ROOT_NODE_ID,
      selected: true,
      data: {
        label: 'ルート（中心概念）',
      },
    });
    expect(edges).toHaveLength(0);
  });

  it('adds a child node and edge for addChildNode', () => {
    // Arrange: ルートノードから子ノードを1つ追加する。
    const childId = useStore.getState().addChildNode(ROOT_NODE_ID);

    expect(childId).not.toBeNull();
    if (!childId) {
      throw new Error('Expected addChildNode to return a node id');
    }

    const { edges, nodes } = useStore.getState();
    const childNode = nodes.find((node) => node.id === childId);

    expect(childNode).toBeDefined();
    expect(childNode).toMatchObject({
      id: childId,
      selected: true,
      data: {
        label: '',
      },
    });
    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({
      source: ROOT_NODE_ID,
      target: childId,
    });
  });

  it('splits root children to both sides after applyAutoLayout', () => {
    // Arrange: root の子を3つ用意して、左右振り分けを確認できる状態にする。
    const rootChildren: MindMapNode[] = [
      createNode('child-a', { x: 0, y: 100 }, false, 'A'),
      createNode('child-b', { x: 0, y: 200 }, false, 'B'),
      createNode('child-c', { x: 0, y: 300 }, false, 'C'),
    ];
    const nodes: MindMapNode[] = [createNode(ROOT_NODE_ID, { x: 0, y: 0 }, true, 'root'), ...rootChildren];
    const edges: MindMapEdge[] = rootChildren.map((child) => createDirectionalEdge(nodes[0], child));

    useStore.setState({
      nodes,
      edges,
      currentCloudMindmapId: 'cloud-1',
    });

    // Act: 自動整列を実行する。
    useStore.getState().applyAutoLayout();

    // Assert: root の子が右側と左側の両方に配置される。
    const laidOutChildren = useStore.getState().nodes.filter((node) => node.id !== ROOT_NODE_ID);
    expect(laidOutChildren.some((node) => node.position.x > 0)).toBe(true);
    expect(laidOutChildren.some((node) => node.position.x < 0)).toBe(true);
  });

  it('adds a sibling node with the same parent and shifted y position', () => {
    // Arrange: ルート配下の子ノードを作ってから、その兄弟を追加する。
    const childId = useStore.getState().addChildNode(ROOT_NODE_ID);

    expect(childId).not.toBeNull();
    if (!childId) {
      throw new Error('Expected addChildNode to return a node id');
    }

    // Act: 同じ親を持つ兄弟ノードを追加する。
    const siblingId = useStore.getState().addSiblingNode(childId);

    expect(siblingId).not.toBeNull();
    if (!siblingId) {
      throw new Error('Expected addSiblingNode to return a node id');
    }

    // Assert: 兄弟ノードの親が同じで、Y 座標が異なることを確認する。
    const { edges, nodes } = useStore.getState();
    const childNode = nodes.find((node) => node.id === childId);
    const siblingNode = nodes.find((node) => node.id === siblingId);

    expect(childNode).toBeDefined();
    expect(siblingNode).toBeDefined();
    expect(edges.find((edge) => edge.target === childId)?.source).toBe(ROOT_NODE_ID);
    expect(edges.find((edge) => edge.target === siblingId)?.source).toBe(ROOT_NODE_ID);
    expect(siblingNode?.position.y).not.toBe(childNode?.position.y);
    expect(siblingNode?.selected).toBe(true);
  });

  it('removes a node and all descendants with removeNode', () => {
    // Arrange: 親子孫の3段階ツリーを作る。
    const childId = useStore.getState().addChildNode(ROOT_NODE_ID);

    expect(childId).not.toBeNull();
    if (!childId) {
      throw new Error('Expected addChildNode to return a node id');
    }

    const grandChildId = useStore.getState().addChildNode(childId);

    expect(grandChildId).not.toBeNull();
    if (!grandChildId) {
      throw new Error('Expected addChildNode to return a node id');
    }

    useStore.getState().removeNode(childId);

    const { edges, nodes } = useStore.getState();

    expect(nodes).toHaveLength(1);
    expect(nodes[0].id).toBe(ROOT_NODE_ID);
    expect(edges).toHaveLength(0);
  });

  it('imports a graph and clears the current cloud mindmap id', () => {
    // Arrange: ダミーのグラフとクラウド ID を用意する。
    const nodes: MindMapNode[] = [
      createNode(ROOT_NODE_ID, { x: 0, y: 0 }, false, 'root'),
      createNode('imported-child', { x: 250, y: 120 }, false, 'imported'),
    ];
    const edges: MindMapEdge[] = [createDirectionalEdge(nodes[0], nodes[1])];
    useStore.setState({
      currentCloudMindmapId: 'cloud-before-import',
    });

    // Act: グラフをインポートする。
    useStore.getState().importGraph(nodes, edges);

    // Assert: 状態が上書きされ、クラウド ID は null に戻る。
    const state = useStore.getState();
    expect(state.currentCloudMindmapId).toBeNull();
    expect(state.nodes).toHaveLength(2);
    expect(state.edges).toHaveLength(1);
    expect(state.nodes[0].id).toBe(ROOT_NODE_ID);
    expect(state.nodes[0].selected).toBe(true);
  });

  it('updates the cloud mindmap id after saveToCloud succeeds', async () => {
    // Arrange: 保存 API と一覧 API のレスポンスをモックする。
    const postResponse = new Response(
      JSON.stringify({
        id: 'cloud-saved-1',
        title: 'ルート（中心概念）',
        created_at: '2026-05-31T00:00:00.000Z',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
    const listResponse = new Response('[]', {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    vi.mocked(client.api.mindmap.$post).mockResolvedValueOnce(postResponse);
    vi.mocked(client.api.mindmaps.$get).mockResolvedValueOnce(listResponse);

    // Act: クラウドへ保存する。
    await useStore.getState().saveToCloud();

    // Assert: 保存後に currentCloudMindmapId がレスポンス ID で更新される。
    expect(useStore.getState().currentCloudMindmapId).toBe('cloud-saved-1');
    expect(vi.mocked(client.api.mindmap.$post)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(client.api.mindmaps.$get)).toHaveBeenCalledTimes(1);
  });

  it('moves focus to the nearest sibling above and below with moveFocus', () => {
    // Arrange: root の子を縦に並べて、下側のノードを選択する。
    const nodes: MindMapNode[] = [
      createNode(ROOT_NODE_ID, { x: 0, y: 0 }, false, 'root'),
      createNode('top-child', { x: 250, y: 50 }, false, 'top'),
      createNode('middle-child', { x: 250, y: 150 }, false, 'middle'),
      createNode('bottom-child', { x: 250, y: 250 }, true, 'bottom'),
    ];
    const edges: MindMapEdge[] = [
      createDirectionalEdge(nodes[0], nodes[1]),
      createDirectionalEdge(nodes[0], nodes[2]),
      createDirectionalEdge(nodes[0], nodes[3]),
    ];

    useStore.setState({ nodes, edges });

    // Act: 上方向へ移動する。
    useStore.getState().moveFocus('up');

    // Assert: ひとつ上の兄弟ノードにフォーカスが移る。
    expect(getSelectedNodeId()).toBe('middle-child');

    // Act: さらに下方向へ移動する。
    useStore.getState().moveFocus('down');

    // Assert: 元のノードより下の兄弟へフォーカスが戻る。
    expect(getSelectedNodeId()).toBe('bottom-child');
  });

  it('moves focus to the parent with moveFocus left', () => {
    // Arrange: 孫ノードを選択した状態を作る。
    const nodes: MindMapNode[] = [
      createNode(ROOT_NODE_ID, { x: 0, y: 0 }, false, 'root'),
      createNode('parent', { x: 250, y: 100 }, false, 'parent'),
      createNode('child', { x: 500, y: 100 }, true, 'child'),
    ];
    const edges: MindMapEdge[] = [
      createDirectionalEdge(nodes[0], nodes[1]),
      createDirectionalEdge(nodes[1], nodes[2]),
    ];

    useStore.setState({ nodes, edges });

    // Act: 左方向へ移動する。
    useStore.getState().moveFocus('left');

    // Assert: 親ノードへフォーカスが移る。
    expect(getSelectedNodeId()).toBe('parent');
  });

  it('moves focus to the first child with moveFocus right', () => {
    // Arrange: root の子を複数用意し、root を選択する。
    const nodes: MindMapNode[] = [
      createNode(ROOT_NODE_ID, { x: 0, y: 0 }, true, 'root'),
      createNode('upper-child', { x: 250, y: 40 }, false, 'upper'),
      createNode('lower-child', { x: 250, y: 200 }, false, 'lower'),
    ];
    const edges: MindMapEdge[] = [
      createDirectionalEdge(nodes[0], nodes[1]),
      createDirectionalEdge(nodes[0], nodes[2]),
    ];

    useStore.setState({ nodes, edges });

    // Act: 右方向へ移動する。
    useStore.getState().moveFocus('right');

    // Assert: y 座標が小さい子ノードが選択される。
    expect(getSelectedNodeId()).toBe('upper-child');
  });

  it('reparents a node to the new parent with updateNodeParent', () => {
    // Arrange: 別々の親を持つ子ノードを作る。
    const firstParentId = useStore.getState().addChildNode(ROOT_NODE_ID);

    expect(firstParentId).not.toBeNull();
    if (!firstParentId) {
      throw new Error('Expected addChildNode to return a node id');
    }

    const secondParentId = useStore.getState().addSiblingNode(firstParentId);

    expect(secondParentId).not.toBeNull();
    if (!secondParentId) {
      throw new Error('Expected addSiblingNode to return a node id');
    }

    const childId = useStore.getState().addChildNode(firstParentId);

    expect(childId).not.toBeNull();
    if (!childId) {
      throw new Error('Expected addChildNode to return a node id');
    }

    // Act: 子ノードの親を新しいノードへ付け替える。
    useStore.getState().updateNodeParent(childId, secondParentId);

    // Assert: エッジの source が新しい親に切り替わる。
    expect(useStore.getState().edges.find((edge) => edge.target === childId)?.source).toBe(secondParentId);
  });

  it('resets the graph back to only the root node with resetGraph', () => {
    // Arrange: 何かしらノードを追加した状態にする。
    const childId = useStore.getState().addChildNode(ROOT_NODE_ID);

    expect(childId).not.toBeNull();

    // Act: グラフを初期状態へ戻す。
    useStore.getState().resetGraph();

    // Assert: ルートノードだけが残る。
    const { edges, nodes } = useStore.getState();

    expect(nodes).toHaveLength(1);
    expect(nodes[0].id).toBe(ROOT_NODE_ID);
    expect(nodes[0].selected).toBe(true);
    expect(edges).toHaveLength(0);
  });
});
