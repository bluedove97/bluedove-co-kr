import type { MetadataRoute } from 'next';
import { ALL_TOOLS } from '@/data/menu';
import { SITE_URL } from '@/lib/site';

// 정적 빌드 시 out/sitemap.xml 로 생성 (메뉴에 추가한 페이지는 자동 포함)
export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: SITE_URL + '/', lastModified, changeFrequency: 'weekly', priority: 1 },
    ...ALL_TOOLS.map((t) => ({
      url: SITE_URL + t.href,
      lastModified,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
  ];
}
