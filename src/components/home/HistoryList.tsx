'use client';

/* 메인 '프로젝트 이력' — 최근 N개만 보이고 '더보기'로 전체 펼침.
   정적 HTML 에는 전체 목록이 들어가고 나머지는 hidden 처리 (SEO 유지) */

import { useRef, useState } from 'react';
import type { HistoryItem } from '@/data/history';

export default function HistoryList({ items, initial = 5 }: { items: HistoryItem[]; initial?: number }) {
  const [expanded, setExpanded] = useState(false);
  const listRef = useRef<HTMLOListElement>(null);
  const rest = items.length - initial;

  function toggle() {
    if (expanded) {
      // 접을 때 목록이 위로 사라지므로 섹션 위치로 돌아간다
      listRef.current?.closest('section')?.scrollIntoView({ block: 'start' });
    } else {
      // 펼친 뒤 키보드 사용자를 새로 나타난 첫 항목으로 이동
      requestAnimationFrame(() => listRef.current?.querySelectorAll<HTMLLIElement>('li')[initial]?.focus());
    }
    setExpanded((v) => !v);
  }

  return (
    <>
      <ol className="history" id="history-list" ref={listRef}>
        {items.map((r, i) => (
          <li key={r.period + r.name} hidden={!expanded && i >= initial} tabIndex={i === initial ? -1 : undefined}>
            <span className="hist-period">{r.period}</span>
            <span className="hist-name">{r.name}</span>
          </li>
        ))}
      </ol>
      {rest > 0 && (
        <div className="history-more">
          <button className="btn btn-outline" type="button" aria-expanded={expanded} aria-controls="history-list" onClick={toggle}>
            {expanded ? '접기' : `더보기 (${rest}개)`}
          </button>
        </div>
      )}
    </>
  );
}
