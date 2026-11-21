'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';

type NavState = { open: boolean; setOpen: (v: boolean) => void; toggle: () => void };

const NavContext = createContext<NavState | null>(null);

export function useNav(): NavState {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error('useNav 는 NavProvider 안에서만 쓸 수 있습니다');
  return ctx;
}

/**
 * 모바일 햄버거 메뉴 열림 상태
 * - body.nav-open 클래스로 CSS(site.css) 가 사이드바를 슬라이드
 * - ESC, 스크림 클릭, 페이지 이동, PC 폭(1024px+) 전환 시 닫힘
 */
export default function NavProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const toggle = useCallback(() => setOpen((v) => !v), []);

  useEffect(() => {
    document.body.classList.toggle('nav-open', open);
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && document.body.classList.contains('nav-open')) {
        setOpen(false);
        document.querySelector<HTMLButtonElement>('.nav-toggle')?.focus();
      }
    };
    const mq = window.matchMedia('(min-width: 1024px)');
    const onMq = (e: MediaQueryListEvent) => {
      if (e.matches) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    mq.addEventListener('change', onMq);
    return () => {
      document.removeEventListener('keydown', onKey);
      mq.removeEventListener('change', onMq);
    };
  }, []);

  return <NavContext.Provider value={{ open, setOpen, toggle }}>{children}</NavContext.Provider>;
}
