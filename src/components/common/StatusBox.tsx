import type { CSSProperties } from 'react';
import type { Status } from '@/types/common';

/** 결과·오류 메시지 영역 (role=status, aria-live) */
export default function StatusBox({ status, style, id }: { status: Status; style?: CSSProperties; id?: string }) {
  return (
    <div id={id} className={'status' + (status.kind ? ' ' + status.kind : '')} role="status" aria-live="polite" style={style}>
      {status.text}
    </div>
  );
}
