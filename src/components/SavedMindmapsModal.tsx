import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';

type SavedMindmapsModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const formatSavedAt = (createdAt: string) => {
  const date = new Date(createdAt);

  if (Number.isNaN(date.getTime())) {
    return createdAt;
  }

  return date.toLocaleString('ja-JP', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

const toErrorMessage = (error: unknown) => (error instanceof Error ? error.message : '予期しないエラーが発生しました');

export default function SavedMindmapsModal({ isOpen, onClose }: SavedMindmapsModalProps) {
  const cloudMindmaps = useStore((state) => state.cloudMindmaps);
  const fetchCloudMindmaps = useStore((state) => state.fetchCloudMindmaps);
  const loadFromCloud = useStore((state) => state.loadFromCloud);
  const deleteFromCloud = useStore((state) => state.deleteFromCloud);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let isActive = true;
    setIsLoading(true);
    setErrorMessage(null);

    void fetchCloudMindmaps()
      .catch((error) => {
        if (isActive) {
          setErrorMessage(toErrorMessage(error));
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [fetchCloudMindmaps, isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleOpen = async (id: string) => {
    try {
      await loadFromCloud(id);
      onClose();
    } catch (error) {
      window.alert(toErrorMessage(error));
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('このマインドマップを削除しますか？')) {
      return;
    }

    try {
      await deleteFromCloud(id);
    } catch (error) {
      window.alert(toErrorMessage(error));
    }
  };

  return (
    <div className="cloud-mindmaps-modal" onClick={onClose}>
      <div className="cloud-mindmaps-modal__overlay" />
      <div
        className="cloud-mindmaps-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="saved-mindmaps-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="cloud-mindmaps-modal__header">
          <div>
            <h2 id="saved-mindmaps-title" className="cloud-mindmaps-modal__title">
              保存されたマインドマップ
            </h2>
            <p className="cloud-mindmaps-modal__subtitle">クラウド上の一覧から、読み込みや削除ができます。</p>
          </div>
          <button type="button" className="cloud-mindmaps-modal__close" onClick={onClose} aria-label="閉じる">
            ×
          </button>
        </div>

        <div className="cloud-mindmaps-modal__body">
          {errorMessage ? <p className="cloud-mindmaps-modal__error">{errorMessage}</p> : null}

          {isLoading && cloudMindmaps.length === 0 ? <p className="cloud-mindmaps-modal__status">読み込み中...</p> : null}

          {!isLoading && cloudMindmaps.length === 0 ? (
            <p className="cloud-mindmaps-modal__empty">保存されたマインドマップはありません</p>
          ) : (
            <ul className="cloud-mindmaps-modal__list">
              {cloudMindmaps.map((mindmap) => (
                <li key={mindmap.id} className="cloud-mindmaps-modal__item">
                  <div className="cloud-mindmaps-modal__info">
                    <span className="cloud-mindmaps-modal__item-title">{mindmap.title}</span>
                    <span className="cloud-mindmaps-modal__item-meta">{formatSavedAt(mindmap.created_at)}</span>
                  </div>

                  <div className="cloud-mindmaps-modal__actions">
                    <button
                      type="button"
                      className="cloud-mindmaps-modal__button cloud-mindmaps-modal__button--primary"
                      onClick={() => void handleOpen(mindmap.id)}
                    >
                      開く
                    </button>
                    <button
                      type="button"
                      className="cloud-mindmaps-modal__button cloud-mindmaps-modal__button--danger"
                      onClick={() => void handleDelete(mindmap.id)}
                    >
                      削除
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
