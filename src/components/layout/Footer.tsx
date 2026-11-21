import Link from 'next/link';
import { SITE_NAME } from '@/lib/site';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div>
          <div className="footer-brand">{SITE_NAME}</div>
          <p>모든 도구는 브라우저 안에서만 동작하며 입력한 데이터를 서버로 보내지 않습니다.</p>
          {/* 빌드 시점의 연도로 출력 (정적 빌드) */}
          <p>© 2004–{new Date().getFullYear()} bluedove.co.kr</p>
        </div>
        <ul className="footer-links">
          <li>
            <Link href="/">홈</Link>
          </li>
          <li>
            <Link href="/#tools">도구 목록</Link>
          </li>
          <li>
            <Link href="/#about">개발자 소개</Link>
          </li>
          {/* <li>
            <a href="/sitemap.xml">사이트맵</a>
          </li> */}
        </ul>
      </div>
    </footer>
  );
}
