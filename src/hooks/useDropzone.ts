'use client';

import { useState, type DragEvent, type KeyboardEvent, type RefObject } from 'react';

/**
 * <label class="dropzone"> 에 붙이는 드래그 앤 드롭 + 키보드(Enter/Space) 선택 핸들러
 * 사용: const drop = useDropzone(onFiles, inputRef); <label {...drop.handlers} className={drop.over ? 'is-over' : ''}>
 */
export function useDropzone(onFiles: (files: FileList) => void, inputRef: RefObject<HTMLInputElement | null>) {
  const [over, setOver] = useState(false);
  const enter = (e: DragEvent) => {
    e.preventDefault();
    setOver(true);
  };
  const leave = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
  };
  return {
    over,
    handlers: {
      onDragEnter: enter,
      onDragOver: enter,
      onDragLeave: leave,
      onDrop: (e: DragEvent) => {
        leave(e);
        if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files);
      },
      onKeyDown: (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          inputRef.current?.click();
        }
      },
    },
  };
}
