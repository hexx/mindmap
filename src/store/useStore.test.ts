import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ROOT_NODE_ID, useStore } from './useStore';

vi.mock('../utils/cloudMindmaps', () => ({
  client: {
    api: {},
  },
}));

describe('useStore', () => {
  beforeEach(() => {
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

  it('removes a node and all descendants with removeNode', () => {
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
});
