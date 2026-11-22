'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { MENU, samePath } from '@/data/menu';
import { useNav } from './NavProvider';

function NavLink({ href, icon, label, current }: { href: string; icon: string; label: string; current: boolean }) {
  return (
    <li>
      <Link className="nav-link" href={href} aria-current={current ? 'page' : undefined}>
        <span className="nav-ico" aria-hidden="true">
          {icon}
        </span>
        <span className="nav-text">{label}</span>
      </Link>
    </li>
  );
}

/** PC: 좌측 고정 메뉴 / 모바일: 햄버거로 여는 슬라이드 메뉴 */
export default function Sidebar() {
  const pathname = usePathname() || '/';
  const { open, setOpen } = useNav();
  const navRef = useRef<HTMLElement>(null);

  // 모바일 메뉴를 열면 현재 메뉴로 포커스
  useEffect(() => {
    if (!open || !navRef.current) return;
    const cur = navRef.current.querySelector<HTMLElement>('[aria-current="page"]') || navRef.current.querySelector<HTMLElement>('a');
    cur?.focus({ preventScroll: true });
  }, [open]);

  // 현재 메뉴가 사이드바 스크롤 영역 밖이면 보이도록
  useEffect(() => {
    const cur = navRef.current?.querySelector<HTMLElement>('[aria-current="page"]');
    if (cur && cur.getBoundingClientRect().bottom > window.innerHeight) cur.scrollIntoView({ block: 'center' });
  }, [pathname]);

  return (
    <>
      <nav id="sidebar" className="sidebar" aria-label="주 메뉴" ref={navRef}>
        <ul className="nav-list nav-home">
          <NavLink href="/" icon="~/" label="HOME · INTRO" current={samePath(pathname, '/')} />
        </ul>
        {MENU.map((group) => (
          <div className="nav-group" key={group.key}>
            <div className="nav-title">{group.title}</div>
            <ul className="nav-list">
              {group.items.map((item) => (
                <NavLink key={item.href} href={item.href} icon={item.icon} label={item.label} current={samePath(pathname, item.href)} />
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="scrim" aria-hidden="true" onClick={() => setOpen(false)}></div>
    </>
  );
}
