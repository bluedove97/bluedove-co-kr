'use client';

import { useRef, type KeyboardEvent } from 'react';

export type TabDef<T extends string> = { id: T; label: string };

/**
 * 접근성 탭 목록 (role=tablist, 방향키·Home·End 이동)
 * 패널은 호출하는 쪽에서 <div {...tabPanelProps(base, id, current)}> 로 렌더링한다.
 */
export function TabList<T extends string>({
  base,
  tabs,
  value,
  onChange,
  label,
}: {
  /** id 접두어 (페이지 안에서 고유) */
  base: string;
  tabs: TabDef<T>[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKey(e: KeyboardEvent, i: number) {
    let n: number | null = null;
    if (e.key === 'ArrowRight') n = (i + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = tabs.length - 1;
    if (n !== null) {
      e.preventDefault();
      onChange(tabs[n].id);
      refs.current[n]?.focus();
    }
  }

  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {tabs.map((t, i) => (
        <button
          key={t.id}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className="tab"
          type="button"
          role="tab"
          id={`${base}-tab-${t.id}`}
          aria-controls={`${base}-panel-${t.id}`}
          aria-selected={value === t.id}
          tabIndex={value === t.id ? 0 : -1}
          onClick={() => onChange(t.id)}
          onKeyDown={(e) => onKey(e, i)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function tabPanelProps(base: string, id: string, current: string) {
  return {
    className: 'tab-panel',
    id: `${base}-panel-${id}`,
    role: 'tabpanel' as const,
    'aria-labelledby': `${base}-tab-${id}`,
    hidden: id !== current,
  };
}
