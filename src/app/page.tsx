import type { Metadata } from 'next';
import Link from 'next/link';
import AdSlot from '@/components/common/AdSlot';
import JsonLd from '@/components/common/JsonLd';
import Runner from '@/components/home/Runner';
import { HISTORY } from '@/data/history';
import HistoryList from '@/components/home/HistoryList';
import { MENU } from '@/data/menu';
import { pageMetadata } from '@/lib/seo';
import { ADSENSE_HOME_POSITIONS, OG_IMAGE, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/site';
import { pad2 } from '@/utils/format';

export const metadata: Metadata = {
  ...pageMetadata({
    href: '/',
    title: "Bluedove's Developer Playground — 개발자 도구 · 생활 계산기 실험실",
    description: SITE_DESCRIPTION,
    keywords: [
      '개발자 도구', '온라인 개발 도구', 'JSON 포매터', 'JWT 디코더', 'Base64', 'URL 인코딩', '타임스탬프 변환',
      '이미지 압축', '텍스트 비교', '만나이 계산기', 'QR code 생성', '연비 계산기', '세계 시간', 'bluedove',
    ],
  }),
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: 'ko_KR',
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: '/',
    images: [OG_IMAGE],
  },
  twitter: { card: 'summary_large_image', title: SITE_NAME, description: SITE_DESCRIPTION, images: [OG_IMAGE.url] },
};

const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': SITE_URL + '/#website',
      url: SITE_URL + '/',
      name: SITE_NAME,
      inLanguage: 'ko-KR',
      description: SITE_DESCRIPTION,
      author: { '@id': SITE_URL + '/#person' },
    },
    {
      '@type': 'Person',
      '@id': SITE_URL + '/#person',
      name: 'bluedove',
      url: SITE_URL + '/',
      jobTitle: 'Software Engineer',
      knowsAbout: ['Java', 'Spring Boot', 'Kubernetes', 'JavaScript', 'DevOps'],
    },
  ],
};

const STACK: { title: string; items: string[] }[] = [
  {
    title: 'Programming',
    items: ['Spring', 'Spring Boot', 'Spring Batch', 'Java', 'JSP', 'JavaScript', 'jQuery', 'Next.js', 'React', 'TypeScript', 'JPA', 'MyBatis', 'C# ASP.NET', 'Blazor'],
  },
  { title: 'Database', items: ['Oracle', 'MySQL', 'MS-SQL', 'PostgreSQL', 'Redis', 'CloudNative-PG'] },
  {
    title: 'Dev-Ops',
    items: ['Ubuntu', 'CentOS', 'Docker', 'Kubernetes', 'KubeKey', 'KubeSphere', 'GitLab', 'GitLab Runner', 'GitHub Actions', 'Harbor', 'Argo CD', 'CI/CD 파이프라인 자동화', 'ELK'],
  },
];

const EXT_LINKS = [
  { href: 'https://proj.pe.kr', name: 'proj.pe.kr', desc: '프로젝트 위주의 다른 홈페이지' },
  { href: 'https://home.proj.pe.kr', name: 'home.proj.pe.kr', desc: 'System Dashboard' },
  { href: 'https://pow.proj.pe.kr', name: 'pow.proj.pe.kr', desc: '단어 배틀 게임' },
  { href: 'https://xpgames.proj.pe.kr', name: 'xpgames.proj.pe.kr', desc: 'XP 고전 게임' },
];

export default function HomePage() {
  const history = [...HISTORY].reverse();
  return (
    <>
      <JsonLd data={JSON_LD} />
      {ADSENSE_HOME_POSITIONS.top && <AdSlot position="top" />}

      <div className="page-body">
        <section className="home-hero" aria-labelledby="home-title">
          <div className="wrap">
            <p className="home-prompt mono">
              <span aria-hidden="true">~/bluedove $</span> ./playground.sh
            </p>
            <h1 id="home-title" className="display">
              Bluedove&apos;s
              <br />
              Developer Playground
            </h1>
            <p className="home-lead">
              브라우저에서 바로 쓰는 유용한 개발 도구와 생활 계산기를 제공합니다.
              <br /> 입력한 데이터는 서버로 가지 않습니다.
              <br /> 설치없음❌, 가입없음❌{' '}
            </p>
            <div className="btn-row home-cta">
              <a className="btn btn-on-dark" href="#tools">
                도구 둘러보기
              </a>
              <a className="btn btn-line-dark" href="#about">
                개발자 소개
              </a>
            </div>
          </div>
        </section>

        <section id="tools" className="band" aria-labelledby="tools-title">
          <div className="wrap">
            <div className="section-head">
              <h2 id="tools-title" className="section-title">
                도구
              </h2>
              <p className="section-lead">자주 쓰는데 매번 검색하게 되는 도구들을 한 곳에 모았습니다.</p>
            </div>

            {MENU.map((group, gi) => (
              <div className="tool-group" key={group.key}>
                <h3 className="tool-group-title">
                  <span className="mono">{pad2(gi + 1)}</span> {group.title}
                </h3>
                <div className="tool-grid">
                  {group.items.map((t) => (
                    <Link className="tool-card" href={t.href} key={t.href}>
                      <span className="tool-ico mono" aria-hidden="true">
                        {t.icon}
                      </span>
                      <span className="tool-text">
                        <b>{t.label}</b>
                        <span>{t.cardDesc}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="about" className="band band-blue" aria-labelledby="about-title">
          <div className="wrap">
            <div className="about-grid">
              <div className="about-intro">
                <h2 id="about-title" className="section-title">
                  개발자 소개
                </h2>
                <p className="about-lead">2004년부터 웹 서비스와 서버, 인프라를 만들어 온 풀스택 개발자 bluedove입니다.</p>
                <p>
                  정부 과제를 시작으로 금융, 유통, 의료, 제조 분야의 시스템을 구축하고 운영해 왔습니다. 쿠버네티스 기반 플랫폼(Certified Kubernetes
                  Administrator)에서 CI/CD 자동화 파이프라인을 구축했으며, 최근에는 LLM API를 이용한 AI Agent 개발도 진행 중입니다
                </p>
                <p>이 사이트는 일하면서 자주 쓰는 작은 도구를 만들어 모아 둔 실험실이자 놀이터입니다. 브라우저 안에서만 동작하니 마음껏 사용하세요.</p>

                <dl className="contact">
                  <dt>Contact</dt>
                  <dd>
                    <a id="contact" className="mono" href="#about">
                      bluek97@bluedove.co.kr
                    </a>
                  </dd>
                </dl>

                <h3 className="subhead links-title">Links</h3>
                <ul className="ext-links">
                  {EXT_LINKS.map((l) => (
                    <li key={l.href}>
                      <a href={l.href} target="_blank" rel="noopener">
                        {l.name}
                        <span>{l.desc}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="about-stack">
                <h3 className="subhead">Technical Stack</h3>
                {STACK.map((s) => (
                  <div className="stack-block" key={s.title}>
                    <p className="stack-title mono">{s.title}</p>
                    <ul className="chips">
                      {s.items.map((x) => (
                        <li key={x}>{x}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            <div className="about-runner">
              <Runner />
            </div>
          </div>
        </section>

        <section id="history" className="band" aria-labelledby="history-title">
          <div className="wrap">
            <div className="section-head">
              <h2 id="history-title" className="section-title">
                프로젝트 이력
              </h2>
              <p className="section-lead">지금까지 진행한 프로젝트 리스트</p>
            </div>
            <HistoryList items={history} initial={6} />
          </div>
        </section>
      </div>

      {ADSENSE_HOME_POSITIONS.bottom && <AdSlot position="bottom" />}
    </>
  );
}
