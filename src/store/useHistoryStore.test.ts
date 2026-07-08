import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialState, type MindMapEdge, type MindMapNode, useStore } from './useStore';
import { canRedo, canUndo, useHistoryStore } from './useHistoryStore';

const createNode = (id: string, x: number, y: number): MindMapNode => ({
  id,
  type: 'mindmap',
  position: { x, y },
  data: { label: id },
});

describe('useHistoryStore のテスト', () => {
  beforeEach(() => {
    // 両ストアを完全にリセット
    useStore.setState(createInitialState());
    useHistoryStore.setState({
      undoStack: [],
      redoStack: [],
      maxHistory: 50,
    });
  });

  describe('pushSnapshot', () => {
    it('undoStack の長さが1増え、redoStack が空になる', () => {
      useHistoryStore.getState().pushSnapshot();

      const state = useHistoryStore.getState();
      expect(state.undoStack).toHaveLength(1);
      expect(state.redoStack).toHaveLength(0);
    });

    it('連続実行で undoStack に順次積まれる', () => {
      useHistoryStore.getState().pushSnapshot();
      useHistoryStore.getState().pushSnapshot();
      useHistoryStore.getState().pushSnapshot();

      expect(useHistoryStore.getState().undoStack).toHaveLength(3);
    });

    it('pushSnapshot が redoStack をクリアする（分岐履歴の破棄）', () => {
      useHistoryStore.getState().pushSnapshot();
      useHistoryStore.getState().pushSnapshot();

      // undo してから pushSnapshot → redoStack がクリアされるはず
      useHistoryStore.getState().undo();
      // redoStack に1つ積まれていることを確認
      expect(useHistoryStore.getState().redoStack).toHaveLength(1);

      useHistoryStore.getState().pushSnapshot();
      expect(useHistoryStore.getState().redoStack).toHaveLength(0);
    });

    it('maxHistory=50 超過で最古の履歴が捨てられる', () => {
      // maxHistory を小さくしてテスト高速化
      useHistoryStore.setState({ maxHistory: 3 });

      for (let i = 0; i < 5; i++) {
        useHistoryStore.getState().pushSnapshot();
      }

      expect(useHistoryStore.getState().undoStack).toHaveLength(3);
    });
  });

  describe('undo', () => {
    it('状態が1つ前に戻り、現在の状態が redoStack に入る', () => {
      // 実際のアプリと同様に、状態変更の前に pushSnapshot で現在の状態を保存する
      // 状態A でスナップショットを取得
      useHistoryStore.getState().pushSnapshot();

      // 状態Bに変更
      useStore.setState({
        nodes: [createNode('root', 0, 0), createNode('child', 250, 0)],
        edges: [{ id: 'root-child', source: 'root', target: 'child' }],
        currentCloudMindmapId: 'cloud-1',
      });

      // undo: 状態A（pushSnapshot時点＝createInitialState）に戻る
      useHistoryStore.getState().undo();

      const currentState = useStore.getState();
      expect(currentState.nodes).toHaveLength(1);
      expect(currentState.edges).toHaveLength(0);
      expect(currentState.currentCloudMindmapId).toBeNull();

      // redoStack に状態Bが入っている
      expect(useHistoryStore.getState().redoStack).toHaveLength(1);
      expect(useHistoryStore.getState().undoStack).toHaveLength(0);
    });

    it('空の undoStack で undo してもエラーにならない', () => {
      expect(() => useHistoryStore.getState().undo()).not.toThrow();
      expect(useHistoryStore.getState().undoStack).toHaveLength(0);
    });
  });

  describe('redo', () => {
    it('状態が1つ先に進み、現在の状態が undoStack に戻る', () => {
      // 操作前に現在の状態を保存
      useHistoryStore.getState().pushSnapshot();

      // 状態を変更
      const nodeB = createNode('child', 250, 0);
      useStore.setState({ nodes: [createNode('root', 0, 0), nodeB], edges: [] });

      useHistoryStore.getState().undo(); // 変更前の状態に戻る（createInitialState: 1ノード）
      useHistoryStore.getState().redo(); // 変更後の状態（2ノード）に戻る

      expect(useStore.getState().nodes).toHaveLength(2);
      expect(useHistoryStore.getState().undoStack).toHaveLength(1);
      expect(useHistoryStore.getState().redoStack).toHaveLength(0);
    });

    it('空の redoStack で redo してもエラーにならない', () => {
      expect(() => useHistoryStore.getState().redo()).not.toThrow();
      expect(useHistoryStore.getState().redoStack).toHaveLength(0);
    });
  });

  describe('canUndo / canRedo', () => {
    it('初期状態では両方 false', () => {
      expect(canUndo()).toBe(false);
      expect(canRedo()).toBe(false);
    });

    it('pushSnapshot 後は canUndo が true', () => {
      useHistoryStore.getState().pushSnapshot();
      expect(canUndo()).toBe(true);
      expect(canRedo()).toBe(false);
    });

    it('undo 後は canRedo が true', () => {
      useHistoryStore.getState().pushSnapshot();
      useHistoryStore.getState().pushSnapshot();
      useHistoryStore.getState().undo();

      expect(canUndo()).toBe(true); // まだ履歴が1つ残っている
      expect(canRedo()).toBe(true);
    });
  });

  describe('完全な undo → redo → undo サイクル', () => {
    it('元の状態に戻ること', () => {
      // 操作前に現在の状態を保存
      useHistoryStore.getState().pushSnapshot();

      // 状態を変更
      const modifiedNodes: MindMapNode[] = [
        createNode('root', 0, 0),
        createNode('a', 250, 0),
        createNode('b', 250, 100),
      ];
      const modifiedEdges: MindMapEdge[] = [
        { id: 'root-a', source: 'root', target: 'a' },
        { id: 'root-b', source: 'root', target: 'b' },
      ];

      useStore.setState({ nodes: modifiedNodes, edges: modifiedEdges });

      // undo → redo → undo サイクル
      useHistoryStore.getState().undo();
      expect(useStore.getState().nodes).toHaveLength(1);

      useHistoryStore.getState().redo();
      expect(useStore.getState().nodes).toHaveLength(3);

      useHistoryStore.getState().undo();
      expect(useStore.getState().nodes).toHaveLength(1);
      expect(useStore.getState().edges).toHaveLength(0);
    });
  });
});
