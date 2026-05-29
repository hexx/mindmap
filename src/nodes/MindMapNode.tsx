import {
  Handle,
  Position,
  type NodeProps,
} from '@xyflow/react';
import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react';
import { type MindMapNode as MindMapFlowNode, useStore } from '../store/useStore';

export default function MindMapNode({ id, data, selected }: NodeProps<MindMapFlowNode>) {
  const updateNodeLabel = useStore((state) => state.updateNodeLabel);
  const [isEditing, setIsEditing] = useState(false);
  const [draftLabel, setDraftLabel] = useState(data.label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditing) {
      setDraftLabel(data.label);
    }
  }, [data.label, isEditing]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const commitLabel = useCallback(() => {
    updateNodeLabel(id, draftLabel);
    setIsEditing(false);
  }, [draftLabel, id, updateNodeLabel]);

  const handleDoubleClick = useCallback((event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setDraftLabel(data.label);
    setIsEditing(true);
  }, [data.label]);

  return (
    <div
      className={[
        'mindmap-node',
        selected ? 'mindmap-node--selected' : '',
        isEditing ? 'mindmap-node--editing' : '',
      ].join(' ')}
      onDoubleClick={handleDoubleClick}
    >
      <Handle type="target" position={Position.Left} className="mindmap-node__handle" />
      {isEditing ? (
        <input
          ref={inputRef}
          className="mindmap-node__input nodrag nopan"
          value={draftLabel}
          placeholder="ラベルを入力"
          onChange={(event) => setDraftLabel(event.target.value)}
          onBlur={commitLabel}
          onKeyDown={(event) => {
            event.stopPropagation();

            if (event.key === 'Enter') {
              event.preventDefault();
              commitLabel();
            }
          }}
          onKeyUp={(event) => {
            event.stopPropagation();
          }}
        />
      ) : (
        <button
          type="button"
          className="mindmap-node__label nodrag nopan"
        >
          {data.label || '無題'}
        </button>
      )}
      <Handle type="source" position={Position.Right} className="mindmap-node__handle" />
    </div>
  );
}
