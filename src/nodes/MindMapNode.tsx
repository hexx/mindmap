import {
  Handle,
  Position,
  type NodeProps,
} from '@xyflow/react';
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { type MindMapNode as MindMapFlowNode, useStore } from '@/store/useStore';
import {
  LEFT_SOURCE_HANDLE_ID,
  LEFT_TARGET_HANDLE_ID,
  RIGHT_SOURCE_HANDLE_ID,
  RIGHT_TARGET_HANDLE_ID,
} from '@/utils/edgeHandles';

export default function MindMapNode({ id, data, selected }: NodeProps<MindMapFlowNode>) {
  const addChildNode = useStore((state) => state.addChildNode);
  const addSiblingNode = useStore((state) => state.addSiblingNode);
  const removeNode = useStore((state) => state.removeNode);
  const updateNodeLabel = useStore((state) => state.updateNodeLabel);
  const [isEditing, setIsEditing] = useState(false);
  const [draftLabel, setDraftLabel] = useState(data.label);
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const didInitializeRef = useRef(false);
  const wasEditingRef = useRef(isEditing);

  useEffect(() => {
    if (!isEditing) {
      setDraftLabel(data.label);
    }
  }, [data.label, isEditing]);

  useEffect(() => {
    if (isEditing) {
      globalThis.requestAnimationFrame(() => {
        globalThis.requestAnimationFrame(() => {
          inputRef.current?.focus();
          inputRef.current?.select();
        });
      });
    }
  }, [isEditing]);

  useEffect(() => {
    if (wasEditingRef.current && !isEditing) {
      buttonRef.current?.focus();
    }

    wasEditingRef.current = isEditing;
  }, [isEditing]);

  // ノードが選択された時、または編集モードが解除された時にボタンにフォーカスを当てる
  // （初回マウント時にすでに selected なノードもカバーする）
  useEffect(() => {
    if (selected && !isEditing && data.label !== '') {
      globalThis.requestAnimationFrame(() => {
        globalThis.requestAnimationFrame(() => {
          buttonRef.current?.focus();
        });
      });
    }

    // data.label はフォーカス条件としてのみ使用し、ラベル変更時の再フォーカスは不要
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, selected]);

  useEffect(() => {
    if (didInitializeRef.current) {
      return;
    }

    didInitializeRef.current = true;

    if (data.label === '') {
      setIsEditing(true);
    }
  // 初回マウント時に空ラベルなら編集モードを開始する（依存配列は空でよい）
  }, []);

  const commitLabel = useCallback(() => {
    updateNodeLabel(id, draftLabel);
    setIsEditing(false);
  }, [draftLabel, id, updateNodeLabel]);

  const handleDoubleClick = useCallback((event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setDraftLabel(data.label);
    setIsEditing(true);
  }, [data.label]);

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      event.stopPropagation();
      setIsEditing(true);
      return;
    }

    if (event.key.length !== 1) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setDraftLabel(event.key);
    setIsEditing(true);
  }, []);

  return (
    <div
      className={cn(
        'mindmap-node min-w-[180px] flex items-center gap-2.5 rounded-full border bg-background px-3.5 py-3 shadow-lg transition-all',
        selected && 'border-primary shadow-primary/20',
        isEditing && 'border-foreground',
      )}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
    >
      <Handle type="target" position={Position.Left} id={LEFT_TARGET_HANDLE_ID} className="mindmap-node__handle" />
      <Handle type="source" position={Position.Left} id={LEFT_SOURCE_HANDLE_ID} className="mindmap-node__handle" />
      {isEditing ? (
        <Input
          ref={inputRef}
          className="nodrag nopan flex-1 border-0 bg-transparent text-center font-semibold focus-visible:ring-0 focus-visible:ring-offset-0"
          value={draftLabel}
          placeholder="ラベルを入力"
          onChange={(event) => setDraftLabel(event.target.value)}
          onBlur={commitLabel}
          onKeyDown={(event) => {
            event.stopPropagation();

            if (event.nativeEvent.isComposing) {
              return;
            }

            if ((event.key === 'Backspace' || event.key === 'Delete') && draftLabel === '') {
              event.preventDefault();
              removeNode(id);
              return;
            }

            if (event.key === 'Tab') {
              event.preventDefault();
              commitLabel();
              addChildNode(id);
              return;
            }

            if (event.key === 'Enter') {
              event.preventDefault();
              commitLabel();
              addSiblingNode(id);
            }
          }}
          onKeyUp={(event) => {
            event.stopPropagation();
          }}
        />
      ) : (
        <button
          type="button"
          ref={buttonRef}
          className="nodrag nopan flex-1 cursor-text appearance-none border-0 bg-transparent text-center font-bold"
        >
          {data.label || '無題'}
        </button>
      )}
      <Handle type="target" position={Position.Right} id={RIGHT_TARGET_HANDLE_ID} className="mindmap-node__handle" />
      <Handle type="source" position={Position.Right} id={RIGHT_SOURCE_HANDLE_ID} className="mindmap-node__handle" />
    </div>
  );
}
