import { create } from 'zustand';
import { type MindMapEdge, type MindMapNode, useStore } from './useStore';

type Snapshot = {
  nodes: MindMapNode[];
  edges: MindMapEdge[];
  currentCloudMindmapId: string | null;
};

type HistoryState = {
  undoStack: Snapshot[];
  redoStack: Snapshot[];
  maxHistory: number;
  pushSnapshot: () => void;
  undo: () => void;
  redo: () => void;
};

const getCurrentSnapshot = (): Snapshot => {
  const { nodes, edges, currentCloudMindmapId } = useStore.getState();
  return structuredClone({ nodes, edges, currentCloudMindmapId });
};

export const useHistoryStore = create<HistoryState>()((set, get) => ({
  undoStack: [],
  redoStack: [],
  maxHistory: 50,

  pushSnapshot: () => {
    const snapshot = getCurrentSnapshot();
    const { undoStack, maxHistory } = get();
    const nextStack = [...undoStack, snapshot].slice(-maxHistory);

    set({
      undoStack: nextStack,
      redoStack: [],
    });
  },

  undo: () => {
    const { undoStack, redoStack } = get();

    if (undoStack.length === 0) {
      return;
    }

    const currentSnapshot = getCurrentSnapshot();
    const previousSnapshot = undoStack[undoStack.length - 1];

    useStore.setState({
      nodes: previousSnapshot.nodes,
      edges: previousSnapshot.edges,
      currentCloudMindmapId: previousSnapshot.currentCloudMindmapId,
    });

    set({
      undoStack: undoStack.slice(0, -1),
      redoStack: [...redoStack, currentSnapshot],
    });
  },

  redo: () => {
    const { undoStack, redoStack } = get();

    if (redoStack.length === 0) {
      return;
    }

    const currentSnapshot = getCurrentSnapshot();
    const nextSnapshot = redoStack[redoStack.length - 1];

    useStore.setState({
      nodes: nextSnapshot.nodes,
      edges: nextSnapshot.edges,
      currentCloudMindmapId: nextSnapshot.currentCloudMindmapId,
    });

    set({
      undoStack: [...undoStack, currentSnapshot],
      redoStack: redoStack.slice(0, -1),
    });
  },

}));

export const canUndo = () => useHistoryStore.getState().undoStack.length > 0;
export const canRedo = () => useHistoryStore.getState().redoStack.length > 0;
