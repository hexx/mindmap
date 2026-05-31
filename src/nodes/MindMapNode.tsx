import {
  Handle,
  Position,
  type NodeProps,
} from '@xyflow/react';
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { type MindMapNode as MindMapFlowNode, useStore } from '../store/useStore';
import {
  LEFT_SOURCE_HANDLE_ID,
  LEFT_TARGET_HANDLE_ID,
  RIGHT_SOURCE_HANDLE_ID,
  RIGHT_TARGET_HANDLE_ID,
} from '../utils/edgeHandles';

export default function MindMapNode({ id, data, selected }: NodeProps<MindMapFlowNode>) {
  const removeNode = useStore((state) => state.removeNode);
  const updateNodeLabel = useStore((state) => state.updateNodeLabel);
  const [isEditing, setIsEditing] = useState(false);
  const [draftLabel, setDraftLabel] = useState(data.label);
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const didInitializeRef = useRef(false);
  const wasSelectedRef = useRef(selected);
  const wasEditingRef = useRef(isEditing);

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

  useEffect(() => {
    if (wasEditingRef.current && !isEditing) {
      buttonRef.current?.focus();
    }

    wasEditingRef.current = isEditing;
  }, [isEditing]);

  useEffect(() => {
    if (selected && !isEditing && data.label !== '') {
      buttonRef.current?.focus();
    }
  }, []);

  useEffect(() => {
    if (!wasSelectedRef.current && selected && !isEditing) {
      buttonRef.current?.focus();
    }

    wasSelectedRef.current = selected;
  }, [isEditing, selected]);

  useEffect(() => {
    if (didInitializeRef.current) {
      return;
    }

    didInitializeRef.current = true;

    if (data.label === '') {
      setIsEditing(true);
    }
  }, [data.label]);

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
      className={[
        'mindmap-node',
        selected ? 'mindmap-node--selected' : '',
        isEditing ? 'mindmap-node--editing' : '',
      ].join(' ')}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
    >
      <Handle type="target" position={Position.Left} id={LEFT_TARGET_HANDLE_ID} className="mindmap-node__handle" />
      <Handle type="source" position={Position.Left} id={LEFT_SOURCE_HANDLE_ID} className="mindmap-node__handle" />
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

            if ((event.key === 'Backspace' || event.key === 'Delete') && draftLabel === '') {
              event.preventDefault();
              removeNode(id);
              return;
            }

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
          ref={buttonRef}
          className="mindmap-node__label nodrag nopan"
        >
          {data.label || '無題'}
        </button>
      )}
      <Handle type="target" position={Position.Right} id={RIGHT_TARGET_HANDLE_ID} className="mindmap-node__handle" />
      <Handle type="source" position={Position.Right} id={RIGHT_SOURCE_HANDLE_ID} className="mindmap-node__handle" />
    </div>
  );
}
