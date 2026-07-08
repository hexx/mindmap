import { Cloud, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  useMindmapList,
  useLoadMindmap,
  useDeleteMindmap,
  toErrorMessage as cloudErrorMessage,
} from '@/hooks/useCloudMindmaps';

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

export default function SavedMindmapsModal({ isOpen, onClose }: SavedMindmapsModalProps) {
  const {
    data: cloudMindmaps = [],
    isLoading,
    error: queryError,
  } = useMindmapList(isOpen);
  const loadMutation = useLoadMindmap();
  const deleteMutation = useDeleteMindmap();

  const firstError = queryError ?? loadMutation.error ?? deleteMutation.error;
  const errorMessage = firstError ? cloudErrorMessage(firstError) : null;

  const handleOpen = (id: string) => {
    loadMutation.mutate(id, {
      onSuccess: () => onClose(),
    });
  };

  const handleDelete = (id: string) => {
    if (!globalThis.confirm('このマインドマップを削除しますか？')) {
      return;
    }

    deleteMutation.mutate(id);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[80vh] overflow-hidden sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cloud className="size-5" />
            保存されたマインドマップ
          </DialogTitle>
          <DialogDescription>
            クラウド上の一覧から、読み込みや削除ができます。
          </DialogDescription>
        </DialogHeader>

        <Separator />

        <div className="overflow-y-auto pr-1">
          {errorMessage && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          {isLoading && cloudMindmaps.length === 0 && (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" />
              読み込み中...
            </div>
          )}

          {!isLoading && cloudMindmaps.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Cloud className="mb-2 size-8" />
              <p>保存されたマインドマップはありません</p>
            </div>
          )}

          {cloudMindmaps.length > 0 && (
            <div className="flex flex-col gap-3">
              {cloudMindmaps.map((mindmap) => (
                <div
                  key={mindmap.id}
                  className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{mindmap.title}</p>
                    <Badge variant="secondary" className="mt-1">
                      {formatSavedAt(mindmap.created_at)}
                    </Badge>
                  </div>

                  <div className="ml-4 flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleOpen(mindmap.id)}
                    >
                      開く
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(mindmap.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
