import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { useMindmapList, useSaveMindmap, useDeleteMindmap, useLoadMindmap } from '../hooks/useCloudMindmaps';
import { useStore } from '../store/useStore';
import type { CloudMindmapSummary, CloudMindmapRecord } from '../utils/cloudMindmapTypes';

// Hono RPC クライアントをモック
const mockMindmapsGet = vi.fn();
const mockMindmapPost = vi.fn();
const mockMindmapGetById = vi.fn();
const mockMindmapPut = vi.fn();
const mockMindmapDelete = vi.fn();

vi.mock('../utils/cloudMindmaps', () => ({
  client: {
    api: {
      mindmaps: {
        $get: () => mockMindmapsGet(),
      },
      mindmap: {
        $post: (opts: { json: Record<string, unknown> }) => mockMindmapPost(opts),
        ':id': {
          $get: (opts: { param: { id: string } }) => mockMindmapGetById(opts),
          $put: (opts: { param: { id: string }; json: Record<string, unknown> }) => mockMindmapPut(opts),
          $delete: (opts: { param: { id: string } }) => mockMindmapDelete(opts),
        },
      },
    },
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // テストではリトライしない
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

const createMockResponse = <T,>(data: T, status = 200): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

describe('useMindmapList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('enabled=false の場合はクエリが実行されない', () => {
    const { result } = renderHook(() => useMindmapList(false), {
      wrapper: createWrapper(),
    });

    expect(result.current.isFetching).toBe(false);
    expect(mockMindmapsGet).not.toHaveBeenCalled();
  });

  it('enabled=true の場合、一覧を取得してデータを返す', async () => {
    const mockData: CloudMindmapSummary[] = [
      { id: '1', title: 'テスト1', created_at: '2026-01-01T00:00:00Z' },
      { id: '2', title: 'テスト2', created_at: '2026-01-02T00:00:00Z' },
    ];

    mockMindmapsGet.mockResolvedValueOnce(createMockResponse(mockData));

    const { result } = renderHook(() => useMindmapList(true), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockData);
    expect(mockMindmapsGet).toHaveBeenCalledTimes(1);
  });

  it('APIエラー時にエラー状態になる', async () => {
    mockMindmapsGet.mockResolvedValueOnce(createMockResponse({ error: 'Server Error' }, 500));

    const { result } = renderHook(() => useMindmapList(true), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });
});

describe('useSaveMindmap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useStore.setState({ nodes: [], edges: [], currentCloudMindmapId: null });
  });

  it('新規保存時に POST を呼び出し、currentCloudMindmapId を更新する', async () => {
    const savedData: CloudMindmapSummary = {
      id: 'saved-1',
      title: '無題のマインドマップ',
      created_at: '2026-01-01T00:00:00Z',
    };

    mockMindmapPost.mockResolvedValueOnce(createMockResponse(savedData, 201));

    const { result } = renderHook(() => useSaveMindmap(), {
      wrapper: createWrapper(),
    });

    result.current.mutate();

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockMindmapPost).toHaveBeenCalledTimes(1);
    expect(useStore.getState().currentCloudMindmapId).toBe('saved-1');
  });

  it('既存更新時に PUT を呼び出す', async () => {
    useStore.setState({ currentCloudMindmapId: 'existing-1' });

    const savedData: CloudMindmapSummary = {
      id: 'existing-1',
      title: '無題のマインドマップ',
      created_at: '2026-01-01T00:00:00Z',
    };

    mockMindmapPut.mockResolvedValueOnce(createMockResponse(savedData));

    const { result } = renderHook(() => useSaveMindmap(), {
      wrapper: createWrapper(),
    });

    result.current.mutate();

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockMindmapPut).toHaveBeenCalledTimes(1);
    expect(mockMindmapPut).toHaveBeenCalledWith(
      expect.objectContaining({
        param: { id: 'existing-1' },
      }),
    );
  });
});

describe('useLoadMindmap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useStore.setState({
      nodes: [{ id: 'root', position: { x: 0, y: 0 }, data: { label: 'root' }, selected: true }],
      edges: [],
      currentCloudMindmapId: null,
    });
  });

  it('読み込み成功時にグラフを上書きし currentCloudMindmapId を更新する', async () => {
    const mockRecord: CloudMindmapRecord = {
      id: 'loaded-1',
      title: '読み込みテスト',
      created_at: '2026-01-01T00:00:00Z',
      nodes: [
        { id: 'root', position: { x: 0, y: 0 }, data: { label: '読み込まれたルート' }, selected: false },
        { id: 'child-1', position: { x: 250, y: 0 }, data: { label: '子ノード' }, selected: false },
      ],
      edges: [{ id: 'e1', source: 'root', target: 'child-1' }],
    };

    mockMindmapGetById.mockResolvedValueOnce(createMockResponse(mockRecord));

    const { result } = renderHook(() => useLoadMindmap(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('loaded-1');

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const state = useStore.getState();
    expect(state.currentCloudMindmapId).toBe('loaded-1');
    expect(state.nodes).toHaveLength(2);
    expect(state.edges).toHaveLength(1);
  });
});

describe('useDeleteMindmap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useStore.setState({ nodes: [], edges: [], currentCloudMindmapId: 'to-delete' });
  });

  it('削除成功時に currentCloudMindmapId をクリアする', async () => {
    mockMindmapDelete.mockResolvedValueOnce(new Response(null, { status: 204 }));

    const { result } = renderHook(() => useDeleteMindmap(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('to-delete');

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(useStore.getState().currentCloudMindmapId).toBeNull();
  });

  it('別のIDを削除した場合は currentCloudMindmapId を変更しない', async () => {
    mockMindmapDelete.mockResolvedValueOnce(new Response(null, { status: 204 }));

    const { result } = renderHook(() => useDeleteMindmap(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('other-id');

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(useStore.getState().currentCloudMindmapId).toBe('to-delete');
  });
});
