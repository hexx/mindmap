import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useStore } from '../store/useStore';
import { client, type CloudMindmapRecord, type CloudMindmapSummary } from '../utils/cloudMindmaps';

const MINDMAPS_QUERY_KEY = ['mindmaps'] as const;

const toErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : '予期しないエラーが発生しました';

const getCloudMindmapTitle = () => {
  const { nodes } = useStore.getState();
  return nodes.find((node) => node.id === 'root')?.data.label.trim() || '無題のマインドマップ';
};

/**
 * クラウド一覧を取得するクエリフック。
 * enabled が true の場合のみ実行される（モーダル表示時のみ）。
 */
export const useMindmapList = (enabled: boolean) =>
  useQuery<CloudMindmapSummary[]>({
    queryKey: MINDMAPS_QUERY_KEY,
    queryFn: async () => {
      const response = await client.api.mindmaps.$get();

      if (!response.ok) {
        throw new Error(`クラウド一覧の取得に失敗しました: ${response.status}`);
      }

      return response.json();
    },
    enabled,
  });

/**
 * クラウドに保存するミューテーションフック。
 * 保存成功時に一覧キャッシュを無効化し、currentCloudMindmapId を更新する。
 */
export const useSaveMindmap = () => {
  const queryClient = useQueryClient();

  return useMutation<CloudMindmapSummary, Error>({
    mutationFn: async () => {
      const { nodes, edges, currentCloudMindmapId } = useStore.getState();
      const payload = {
        title: getCloudMindmapTitle(),
        nodes,
        edges,
      };

      const requestPayload = currentCloudMindmapId
        ? { ...payload, id: currentCloudMindmapId }
        : payload;

      const response = currentCloudMindmapId
        ? await client.api.mindmap[':id'].$put({
            param: { id: currentCloudMindmapId },
            json: requestPayload,
          })
        : await client.api.mindmap.$post({
            json: requestPayload,
          });

      if (!response.ok) {
        throw new Error(`クラウドへの保存に失敗しました: ${response.status}`);
      }

      return response.json();
    },
    onSuccess: (data) => {
      // 保存成功時: currentCloudMindmapId を更新し、一覧キャッシュを無効化
      useStore.setState({ currentCloudMindmapId: data.id });
      queryClient.invalidateQueries({ queryKey: MINDMAPS_QUERY_KEY });
    },
  });
};

/**
 * クラウドから読み込むミューテーションフック。
 * 読み込み成功時にグラフを上書きし、currentCloudMindmapId を更新する。
 */
export const useLoadMindmap = () => {
  const queryClient = useQueryClient();

  return useMutation<CloudMindmapRecord, Error, string>({
    mutationFn: async (id: string) => {
      const response = await client.api.mindmap[':id'].$get({
        param: { id },
      });

      if (!response.ok) {
        throw new Error(`クラウドからの読み込みに失敗しました: ${response.status}`);
      }

      return response.json();
    },
    onSuccess: (data) => {
      // 読み込み成功時: グラフを上書きし、currentCloudMindmapId を更新
      // importGraph が例外を投げても onError で捕捉されるよう try-catch で保護
      try {
        useStore.getState().importGraph(data.nodes, data.edges);
      } catch {
        // データ不正時は状態を更新せず抜ける（mutation は success のまま）
        return;
      }
      useStore.setState({ currentCloudMindmapId: data.id });
      queryClient.invalidateQueries({ queryKey: MINDMAPS_QUERY_KEY });
    },
  });
};

/**
 * クラウドから削除するミューテーションフック。
 * 削除成功時に currentCloudMindmapId をクリアし、一覧キャッシュを無効化する。
 */
export const useDeleteMindmap = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id: string) => {
      const response = await client.api.mindmap[':id'].$delete({
        param: { id },
      });

      if (!response.ok) {
        throw new Error(`クラウドからの削除に失敗しました: ${response.status}`);
      }
    },
    onSuccess: (_, id) => {
      // 削除成功時: 削除したのが現在のマインドマップなら ID をクリア
      useStore.setState((state) => ({
        currentCloudMindmapId: state.currentCloudMindmapId === id ? null : state.currentCloudMindmapId,
      }));
      queryClient.invalidateQueries({ queryKey: MINDMAPS_QUERY_KEY });
    },
  });
};

export { toErrorMessage };
