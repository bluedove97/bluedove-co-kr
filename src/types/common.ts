import type { ReactNode } from 'react';

/** 상태 메시지 영역(.status) 의 종류 — '' 는 기본(회색) */
export type StatusKind = '' | 'ok' | 'warn' | 'err';

export type Status = { kind: StatusKind; text: ReactNode };

export const EMPTY_STATUS: Status = { kind: '', text: '' };
