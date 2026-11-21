import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: { absolute: "페이지를 찾을 수 없습니다 | Bluedove's Developer Playground" },
  robots: { index: false, follow: true },
};

/** out/404.html 로 빌드됨 (.htaccess ErrorDocument 404) */
export default function NotFound() {
  return (
    <section className="nf">
      <div className="nf-box">
        <p className="nf-code">404</p>
        <h1>페이지를 찾을 수 없습니다</h1>
        <p>주소가 바뀌었거나 없어진 페이지입니다. 예전 블로그 주소로 오셨다면 새로 바뀐 개발자 실험실을 둘러보세요.</p>
        <div className="btn-row">
          <Link className="btn" href="/">
            홈으로
          </Link>
          <Link className="btn btn-outline" href="/#tools">
            도구 목록
          </Link>
        </div>
      </div>
    </section>
  );
}
