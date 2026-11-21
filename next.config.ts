import type { NextConfig } from 'next';

/**
 * 정적 빌드 설정
 * - npm run build → out/ 폴더에 순수 HTML/CSS/JS 생성 (Apache 웹호스팅에 FTP 업로드)
 * - trailingSlash: /developer/json/ → out/developer/json/index.html (기존 URL 구조 그대로 유지)
 */
const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;
