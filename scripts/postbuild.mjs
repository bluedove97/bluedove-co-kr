/**
 * npm run build 직후 자동 실행 (package.json 의 "postbuild")
 *
 * Next.js 16 정적 빌드(output: 'export') 의 prefetch 파일 경로 불일치 보정
 * - 빌드 결과:      out/developer/json/__next.developer/json/__PAGE__.txt   (폴더로 저장)
 * - 브라우저 요청:  out/developer/json/__next.developer.json.__PAGE__.txt   (점으로 이어 붙인 파일명)
 * → 폴더 안의 세그먼트 파일을 브라우저가 요청하는 파일명으로 복사하고, 폴더는 지운다.
 *   (이 보정이 없으면 메뉴 링크 prefetch 마다 404 가 나고 Apache 가 404.html 을 내려 줌)
 */
import fs from 'fs';
import path from 'path';

const OUT = path.resolve('out');
let copied = 0;
const removeDirs = [];

function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (!ent.isDirectory()) continue;
    if (ent.name === '_next') continue;
    if (ent.name.startsWith('__next.')) {
      flatten(dir, full, ent.name);
      removeDirs.push(full);
    } else {
      walk(full);
    }
  }
}

/** routeDir/__next.a/b/__PAGE__.txt → routeDir/__next.a.b.__PAGE__.txt */
function flatten(routeDir, segRoot, prefix) {
  (function rec(d, rel) {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, ent.name);
      const r = rel + '.' + ent.name;
      if (ent.isDirectory()) rec(p, r);
      else if (ent.name.endsWith('.txt')) {
        const target = path.join(routeDir, r);
        if (!fs.existsSync(target)) {
          fs.copyFileSync(p, target);
          copied++;
        }
      }
    }
  })(segRoot, prefix);
}

if (!fs.existsSync(OUT)) {
  console.error('[postbuild] out/ 폴더가 없습니다. next build 가 실패했는지 확인하세요.');
  process.exit(1);
}
walk(OUT);
for (const d of removeDirs) fs.rmSync(d, { recursive: true, force: true });
console.log(`[postbuild] prefetch 세그먼트 파일 ${copied}개 경로 보정 완료`);
