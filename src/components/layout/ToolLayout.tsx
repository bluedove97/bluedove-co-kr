import Link from 'next/link';
import type { ReactNode } from 'react';
import AdSlot from '@/components/common/AdSlot';
import JsonLd from '@/components/common/JsonLd';
import { ALL_TOOLS, findTool } from '@/data/menu';
import { toolJsonLd, type ToolPageInfo } from '@/lib/seo';

/**
 * 도구 페이지 공통 바디 레이아웃
 * 브레드크럼 → 히어로 → 광고(상) → 도구 본체 → 사용 방법·FAQ → 광고(하) → 다른 도구
 */
export default function ToolLayout({
  page,
  heroDesc,
  guide,
  children,
}: {
  page: ToolPageInfo;
  heroDesc: ReactNode;
  guide: ReactNode;
  children: ReactNode;
}) {
  const { group, item } = findTool(page.href);
  const related = page.related.map((href) => ALL_TOOLS.find((t) => t.href === href)).filter((t) => t !== undefined);

  return (
    <>
      <JsonLd data={toolJsonLd(page)} />
      <nav className="crumbs" aria-label="현재 위치">
        <ol>
          <li>
            <Link href="/">홈</Link>
          </li>
          <li>
            <Link href={group.items[0].href}>{group.title}</Link>
          </li>
          <li>
            <span aria-current="page">{item.title}</span>
          </li>
        </ol>
      </nav>
      <section className="hero-band">
        <div className="wrap">
          <p className="hero-kicker">
            {group.title} / {item.slug}
          </p>
          <h1 className="hero-title">{item.title}</h1>
          <p className="hero-desc">{heroDesc}</p>
          <div className="hero-badges">
            <span className="hero-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect x="4" y="11" width="16" height="10" rx="2" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              </svg>
              브라우저에서만 처리
            </span>
            <span className="hero-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M20 6 9 17l-5-5" />
              </svg>
              무료 · 회원가입 없음
            </span>
          </div>
        </div>
      </section>
      <AdSlot position="top" />

      <div className="page-body">{children}</div>

      <section className="band band-neutral" aria-labelledby="guide-title">
        <div className="wrap prose">{guide}</div>
      </section>
      <AdSlot position="bottom" />

      {related.length > 0 && (
        <section className="band related-band" aria-labelledby="related-title">
          <div className="wrap">
            <h2 id="related-title" className="subhead" style={{ marginBottom: 16 }}>
              다른 도구
            </h2>
            <div className="related">
              {related.map((t) => (
                <Link key={t.href} href={t.href}>
                  <b>{t.label}</b>
                  <span>{t.relatedDesc}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
