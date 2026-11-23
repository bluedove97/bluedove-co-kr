import type { Metadata } from 'next';
import { findTool } from '@/data/menu';
import { OG_IMAGE, SITE_NAME, SITE_URL } from './site';

/** 도구 페이지(page.tsx)마다 선언하는 SEO 정보 */
export type ToolPageInfo = {
  href: string;
  /** <title> 전체 문자열 */
  title: string;
  description: string;
  keywords: string[];
  /** FAQPage 구조화 데이터 (Guide.tsx 의 FAQ 와 내용 맞추기) */
  faq: { q: string; a: string }[];
  /** 하단 '다른 도구'에 보여 줄 페이지 href 목록 */
  related: string[];
};

export function pageMetadata(o: { href: string; title: string; description: string; keywords: string[] }): Metadata {
  return {
    title: { absolute: o.title },
    description: o.description,
    keywords: o.keywords,
    alternates: { canonical: o.href },
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      locale: 'ko_KR',
      title: o.title,
      description: o.description,
      url: o.href,
      images: [OG_IMAGE],
    },
    twitter: { card: 'summary_large_image', title: o.title, description: o.description, images: [OG_IMAGE.url] },
  };
}

export function toolMetadata(p: ToolPageInfo): Metadata {
  return pageMetadata(p);
}

const APP_CATEGORY = {
  developer: 'DeveloperApplication',
  daily: 'UtilitiesApplication',
  playground: 'GameApplication',
} as const;

export function toolJsonLd(p: ToolPageInfo) {
  const { group, item } = findTool(p.href);
  const url = SITE_URL + p.href;
  const graph: object[] = [
    {
      '@type': 'WebApplication',
      name: item.title,
      url,
      description: p.description,
      inLanguage: 'ko-KR',
      applicationCategory: APP_CATEGORY[group.key],
      operatingSystem: 'Any (Web Browser)',
      browserRequirements: 'Requires JavaScript',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
      isPartOf: { '@id': SITE_URL + '/#website' },
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: '홈', item: SITE_URL + '/' },
        { '@type': 'ListItem', position: 2, name: group.title, item: SITE_URL + group.items[0].href },
        { '@type': 'ListItem', position: 3, name: item.title, item: url },
      ],
    },
  ];
  if (p.faq.length) {
    graph.push({
      '@type': 'FAQPage',
      mainEntity: p.faq.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    });
  }
  return { '@context': 'https://schema.org', '@graph': graph };
}
