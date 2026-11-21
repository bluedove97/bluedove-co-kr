'use client';

import Link from 'next/link';
import { useNav } from './NavProvider';

export default function Header() {
  const { open, toggle } = useNav();
  return (
    <header className="topbar">
      <button
        className="nav-toggle"
        type="button"
        aria-controls="sidebar"
        aria-expanded={open}
        aria-label={open ? '메뉴 닫기' : '메뉴 열기'}
        onClick={toggle}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>
      <Link className="brand" href="/" aria-label="Bluedove's Developer Playground 홈">
        <span>
          <span className="brand-name">Bluedove&apos;s</span> <span className="brand-sub"><span className="brand-sub-long">Developer </span>Playground</span>
        </span>
      </Link>
      <span className="topbar-spacer"></span>
      <Link className="topbar-link hide-sm" href="/#tools">
        Tools
      </Link>
      <Link className="topbar-link" href="/#about">
        About
      </Link>
    </header>
  );
}
