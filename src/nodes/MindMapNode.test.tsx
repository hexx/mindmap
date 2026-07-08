import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { type NodeProps } from '@xyflow/react';
import type { MindMapNode as MindMapNodeType } from '@/store/useStore';

// ReactFlow の Handle をモック
vi.mock('@xyflow/react', () => ({
  Handle: ({ id }: { id: string }) => React.createElement('div', { 'data-testid': `handle-${id}` }),
  Position: { Left: 'left', Right: 'right' },
}));

// UI コンポーネントをモック（shadcn/ui Input はシンプルな input として扱う）
vi.mock('@/components/ui/input', () => ({
  Input: React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>((props, ref) =>
    React.createElement('input', { ...props, ref }),
  ),
}));

// lib/utils の cn をモック（クラス名をそのまま返す）
vi.mock('@/lib/utils', () => ({
  cn: (...args: (string | false | null | undefined)[]) => args.filter(Boolean).join(' '),
}));

// edgeHandles の定数をモック
vi.mock('@/utils/edgeHandles', () => ({
  LEFT_SOURCE_HANDLE_ID: 'left-source',
  LEFT_TARGET_HANDLE_ID: 'left-target',
  RIGHT_SOURCE_HANDLE_ID: 'right-source',
  RIGHT_TARGET_HANDLE_ID: 'right-target',
}));

// zustand ストアのモック
const mockAddChildNode = vi.fn().mockReturnValue('new-child-id');
const mockAddSiblingNode = vi.fn().mockReturnValue('new-sibling-id');
const mockRemoveNode = vi.fn();
const mockUpdateNodeLabel = vi.fn();

vi.mock('@/store/useStore', () => ({
  useStore: (selector: (state: unknown) => unknown) => {
    const state = {
      addChildNode: mockAddChildNode,
      addSiblingNode: mockAddSiblingNode,
      removeNode: mockRemoveNode,
      updateNodeLabel: mockUpdateNodeLabel,
    };
    return selector(state);
  },
  type: {},
}));

// MindMapNode コンポーネントをインポート（モック設定後に遅延インポート）
const { default: MindMapNode } = await import('@/nodes/MindMapNode');

type MindMapNodeData = {
  label: string;
};

const createDefaultProps = (overrides: Partial<NodeProps<MindMapNodeType>> = {}): NodeProps<MindMapNodeType> => ({
  id: 'test-node-1',
  type: 'mindmap',
  data: { label: 'テストノード' } as MindMapNodeData,
  selected: false,
  isConnectable: true,
  zIndex: 0,
  xPos: 0,
  yPos: 0,
  dragging: false,
  ...overrides,
} as NodeProps<MindMapNodeType>);

describe('MindMapNode コンポーネントのテスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('通常表示', () => {
    it('ラベルが表示され、input が表示されていない', () => {
      render(React.createElement(MindMapNode, createDefaultProps()));

      expect(screen.getByText('テストノード')).toBeDefined();
      expect(screen.queryByPlaceholderText('ラベルを入力')).toBeNull();
    });

    it('空ラベルでマウントすると編集モードになる（input 表示）', () => {
      render(React.createElement(MindMapNode, createDefaultProps({
        data: { label: '' } as MindMapNodeData,
      })));

      expect(screen.getByPlaceholderText('ラベルを入力')).toBeDefined();
    });

    it('ラベルが空のときは「無題」と表示される', () => {
      // didInitializeRef が初回のみ空ラベルを編集モードにするため、
      // 2回目のレンダリングでは「無題」が表示される
      const { rerender } = render(React.createElement(MindMapNode, createDefaultProps({
        data: { label: 'あり' } as MindMapNodeData,
      })));

      rerender(React.createElement(MindMapNode, createDefaultProps({
        data: { label: '' } as MindMapNodeData,
      })));

      expect(screen.getByText('無題')).toBeDefined();
    });
  });

  describe('選択状態のスタイル', () => {
    it('selected が true のとき border-primary クラスが付与される', () => {
      const { container } = render(React.createElement(MindMapNode, createDefaultProps({
        selected: true,
        data: { label: '選択中' } as MindMapNodeData,
      })));

      const nodeDiv = container.querySelector('.mindmap-node');
      expect(nodeDiv?.className).toContain('border-primary');
    });

    it('selected が false のとき border-primary クラスは付与されない', () => {
      const { container } = render(React.createElement(MindMapNode, createDefaultProps({
        selected: false,
        data: { label: '非選択' } as MindMapNodeData,
      })));

      const nodeDiv = container.querySelector('.mindmap-node');
      expect(nodeDiv?.className).not.toContain('border-primary');
    });
  });

  describe('ダブルクリック', () => {
    it('ダブルクリックで編集モードに切り替わる', async () => {
      const user = userEvent.setup();
      render(React.createElement(MindMapNode, createDefaultProps()));

      const nodeDiv = document.querySelector('.mindmap-node')!;
      await user.dblClick(nodeDiv);

      expect(screen.getByPlaceholderText('ラベルを入力')).toBeDefined();
    });
  });

  describe('Space キーによる編集モード開始', () => {
    it('Space キーで編集モードに切り替わる', async () => {
      const user = userEvent.setup();
      render(React.createElement(MindMapNode, createDefaultProps()));

      const nodeDiv = document.querySelector('.mindmap-node') as HTMLElement;
      nodeDiv.focus();
      await user.keyboard(' ');

      expect(screen.getByPlaceholderText('ラベルを入力')).toBeDefined();
    });
  });

  describe('文字キー押下で編集モード開始', () => {
    it('文字キーを押すと編集モードに入り、その文字が draftLabel に入る', async () => {
      const user = userEvent.setup();
      render(React.createElement(MindMapNode, createDefaultProps()));

      const nodeDiv = document.querySelector('.mindmap-node') as HTMLElement;
      nodeDiv.focus();
      await user.keyboard('a');

      const input = screen.getByPlaceholderText('ラベルを入力') as HTMLInputElement;
      expect(input).toBeDefined();
      expect(input.value).toBe('a');
    });
  });

  describe('編集モード中のキー操作', () => {
    it('Tab キーで commitLabel → addChildNode が呼ばれる', async () => {
      const user = userEvent.setup();
      render(React.createElement(MindMapNode, createDefaultProps()));

      // ダブルクリックで編集モードへ
      await user.dblClick(document.querySelector('.mindmap-node')!);

      const input = screen.getByPlaceholderText('ラベルを入力');
      await user.type(input, '新しいラベル');
      await user.keyboard('{Tab}');

      expect(mockUpdateNodeLabel).toHaveBeenCalledWith('test-node-1', '新しいラベル');
      expect(mockAddChildNode).toHaveBeenCalledWith('test-node-1');
    });

    it('Enter キーで commitLabel → addSiblingNode が呼ばれる', async () => {
      const user = userEvent.setup();
      render(React.createElement(MindMapNode, createDefaultProps()));

      await user.dblClick(document.querySelector('.mindmap-node')!);

      const input = screen.getByPlaceholderText('ラベルを入力');
      await user.type(input, 'ラベル');
      await user.keyboard('{Enter}');

      expect(mockUpdateNodeLabel).toHaveBeenCalledWith('test-node-1', 'ラベル');
      expect(mockAddSiblingNode).toHaveBeenCalledWith('test-node-1');
    });

    it('空欄で Backspace キーを押すと removeNode が呼ばれる', async () => {
      const user = userEvent.setup();
      render(React.createElement(MindMapNode, createDefaultProps()));

      await user.dblClick(document.querySelector('.mindmap-node')!);

      const input = screen.getByPlaceholderText('ラベルを入力');
      // デフォルト値は「テストノード」なので、まず全選択して削除
      await user.clear(input);
      await user.keyboard('{Backspace}');

      expect(mockRemoveNode).toHaveBeenCalledWith('test-node-1');
    });
  });

  describe('input の blur', () => {
    it('blur で commitLabel が呼ばれ編集モードが終了する', async () => {
      const user = userEvent.setup();
      render(React.createElement(MindMapNode, createDefaultProps()));

      await user.dblClick(document.querySelector('.mindmap-node')!);

      const input = screen.getByPlaceholderText('ラベルを入力');
      await user.type(input, '確定ラベル');
      await user.tab(); // blur 発生

      expect(mockUpdateNodeLabel).toHaveBeenCalledWith('test-node-1', '確定ラベル');
      // 編集モード終了 → input が消える
      expect(screen.queryByPlaceholderText('ラベルを入力')).toBeNull();
    });
  });

  describe('Handle のレンダリング', () => {
    it('4つの Handle がレンダリングされる', () => {
      render(React.createElement(MindMapNode, createDefaultProps()));

      expect(screen.getByTestId('handle-left-source')).toBeDefined();
      expect(screen.getByTestId('handle-left-target')).toBeDefined();
      expect(screen.getByTestId('handle-right-source')).toBeDefined();
      expect(screen.getByTestId('handle-right-target')).toBeDefined();
    });
  });
});
