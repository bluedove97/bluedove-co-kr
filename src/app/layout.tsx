import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import Footer from '@/components/layout/Footer';
import Header from '@/components/layout/Header';
import NavProvider from '@/components/layout/NavProvider';
import Sidebar from '@/components/layout/Sidebar';
import { ADSENSE_ACTIVE, ADSENSE_CLIENT, SITE_NAME, SITE_URL } from '@/lib/site';

import '@/styles/site.css';
import '@/styles/tools.css';
import '@/styles/home.css';
import '@/styles/browser.css';
import '@/styles/webgl.css';
import '@/styles/font-gowun.css'; // 작은 글씨 → 고운바탕. font-family 를 덮어쓰므로 반드시 마지막에 import

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: `%s | Bluedove` },
  authors: [{ name: 'bluedove' }],
  robots: { index: true, follow: true, 'max-image-preview': 'large' },
  icons: { icon: [{ url: '/favicon.ico', sizes: 'any' }] },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#f5f6f7',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" className={ADSENSE_ACTIVE ? 'ads-enabled' : undefined}>
      <head>
        <link rel="preload" href="/fonts/MaruBuri-Regular.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        {/* AdSense 권장 형태 그대로의 <script async> (next/script 는 data-nscript 속성이 붙어 AdSense 가 경고를 냄) */}
        {ADSENSE_ACTIVE && (
          <script async src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`} crossOrigin="anonymous" />
        )}
      </head>
      <body>
        <a className="skip-link" href="#content">
          본문 바로가기
        </a>
        <NavProvider>
          <Header />
          <div className="shell">
            <Sidebar />
            <main id="content" className="main">
              {children}
              <Footer />
            </main>
          </div>
        </NavProvider>
      </body>
    </html>
  );
}
