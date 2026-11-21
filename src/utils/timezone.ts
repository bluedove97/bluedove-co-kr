/* Intl API 기반 시간대 유틸 (Timestamp · 해외시간 공용) */

export type ZoneParts = { year: string; month: string; day: string; hour: string; minute: string; second: string; weekday: string };

const dtfCache: Record<string, Intl.DateTimeFormat> = {};

/** 특정 시간대의 벽시계 시각 구성 요소 (hour 는 00~23) */
export function partsIn(ms: number, tz: string): ZoneParts {
  const f =
    dtfCache[tz] ||
    (dtfCache[tz] = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      weekday: 'short',
    }));
  const p: Record<string, string> = {};
  f.formatToParts(new Date(ms)).forEach((x) => {
    p[x.type] = x.value;
  });
  if (p.hour === '24') p.hour = '00';
  return p as ZoneParts;
}

/** UTC 대비 오프셋 (분) */
export function offsetMin(ms: number, tz: string): number {
  const p = partsIn(ms, tz);
  return Math.round((Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - Math.floor(ms / 1000) * 1000) / 60000);
}

export function offsetLabel(ms: number, tz: string): string {
  let off = offsetMin(ms, tz);
  const sign = off >= 0 ? '+' : '-';
  off = Math.abs(off);
  return 'UTC' + sign + String(Math.floor(off / 60)).padStart(2, '0') + ':' + String(off % 60).padStart(2, '0');
}

/** 해당 시간대의 벽시계 시각(UTC 로 계산한 ms) → 실제 epoch ms (오프셋 2회 보정: DST 경계 대응) */
export function wallToEpoch(wall: number, tz: string): number {
  const guess = wall - offsetMin(wall, tz) * 60000;
  return wall - offsetMin(guess, tz) * 60000;
}

/** datetime-local 입력값 형식 (초 포함 여부 선택) */
export function nowLocalInput(tz: string, withSeconds = true): string {
  const p = partsIn(Date.now(), tz);
  return p.year + '-' + p.month + '-' + p.day + 'T' + p.hour + ':' + p.minute + (withSeconds ? ':' + p.second : '');
}

export const WEEKDAY_KO: Record<string, string> = { Sun: '일', Mon: '월', Tue: '화', Wed: '수', Thu: '목', Fri: '금', Sat: '토' };
