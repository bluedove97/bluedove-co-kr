'use client';

/* 브라우저 기능 진단 — '검사 시작'을 누르면 8개 카테고리를 차례로 검사하고 결과를 보여 준다 */

import { useState } from 'react';
import Segmented from '@/components/common/Segmented';
import { download, toast } from '@/utils/browser';
import { pad2 } from '@/utils/format';
import { CATEGORIES, TOTAL_CHECKS, detectEnv, runCheck, type CheckResult, type Env, type Status } from './checks';

type Phase = 'idle' | 'running' | 'done';
type Filter = 'all' | 'issues';

const STATUS_META: Record<Status, { label: string; ko: string }> = {
  pass: { label: 'PASS', ko: '실행 성공' },
  info: { label: 'INFO', ko: '환경 정보' },
  fail: { label: 'FAIL', ko: 'API는 있지만 실행 실패' },
  unsupported: { label: 'UNSUPPORTED', ko: 'API 없음' },
  blocked: { label: 'BLOCKED', ko: '권한 · 정책으로 막힘' },
  na: { label: 'N/A', ko: '이 환경에 해당 없음' },
};
const STATUS_ORDER: Status[] = ['pass', 'info', 'fail', 'unsupported', 'blocked', 'na'];
const ISSUE: Status[] = ['fail', 'unsupported', 'blocked'];

function Badge({ status }: { status: Status | 'pending' }) {
  if (status === 'pending') return <span className="fc-badge pending">—</span>;
  return <span className={'fc-badge ' + status}>{STATUS_META[status].label}</span>;
}

/** 카테고리 점수: 사용 가능(PASS + INFO) / 해당 항목(N/A 제외) */
function catScore(ids: string[], results: Record<string, CheckResult>) {
  let ok = 0;
  let total = 0;
  for (const id of ids) {
    const r = results[id];
    if (!r || r.status === 'na') continue;
    total++;
    if (r.status === 'pass' || r.status === 'info') ok++;
  }
  return { ok, total };
}

function stamp(d: Date) {
  return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}-${pad2(d.getHours())}${pad2(d.getMinutes())}`;
}

export default function FeaturesTool() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [env, setEnv] = useState<Env | null>(null);
  const [results, setResults] = useState<Record<string, CheckResult>>({});
  const [done, setDone] = useState(0);
  const [testedAt, setTestedAt] = useState<Date | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<Filter>('all');

  async function start() {
    if (phase === 'running') return;
    setPhase('running');
    setResults({});
    setDone(0);
    const t0 = performance.now();
    const e = await detectEnv();
    setEnv(e);
    let n = 0;
    for (const cat of CATEGORIES) {
      for (const check of cat.checks) {
        const r = await runCheck(check, e);
        setResults((s) => ({ ...s, [check.id]: r }));
        setDone(++n);
      }
    }
    setElapsed(Math.round(performance.now() - t0));
    setTestedAt(new Date());
    setPhase('done');
    toast('검사를 마쳤습니다');
  }

  /* 상태별 개수 */
  const counts = STATUS_ORDER.reduce(
    (o, s) => ((o[s] = Object.values(results).filter((r) => r.status === s).length), o),
    {} as Record<Status, number>,
  );

  const val = (id: string) => results[id]?.value;
  const hasResults = phase !== 'idle';

  function exportJson() {
    if (!env || !testedAt) return;
    const data = {
      tool: "Bluedove's Developer Playground — 브라우저 기능 진단",
      url: location.origin + location.pathname,
      testedAt: testedAt.toISOString(),
      durationMs: elapsed,
      environment: {
        browser: env.browser,
        browserVersion: env.browserVersion,
        detectedBy: env.browserSource,
        os: env.os,
        deviceType: env.deviceType,
        secureContext: env.secure,
        userAgent: env.userAgent,
      },
      summary: Object.fromEntries(STATUS_ORDER.map((s) => [STATUS_META[s].label, counts[s]])),
      categories: CATEGORIES.map((c) => {
        const sc = catScore(
          c.checks.map((x) => x.id),
          results,
        );
        return {
          id: c.id,
          name: c.name,
          available: sc.ok,
          applicable: sc.total,
          items: c.checks.map((x) => ({
            id: x.id,
            name: x.name,
            status: results[x.id] ? STATUS_META[results[x.id].status].label : null,
            value: results[x.id]?.value ?? null,
            note: results[x.id]?.note ?? null,
            method: x.method,
            reference: x.ref ?? null,
          })),
        };
      }),
    };
    download(JSON.stringify(data, null, 2), `browser-features-${stamp(testedAt)}.json`, 'application/json;charset=utf-8');
  }

  const setAll = (v: boolean) => setOpen(Object.fromEntries(CATEGORIES.map((c) => [c.id, v])));

  return (
    <section className="tool">
      <div className="wrap fc">
        {/* ---------- 요약 카드 ---------- */}
        <div className="fc-head surface-white">
          <div className="fc-head-top">
            <div>
              <p className="fc-browser">{env ? `${env.browser}${env.browserVersion ? ' ' + env.browserVersion.split('.')[0] : ''}` : '브라우저 미확인'}</p>
              <p className="meta">{env ? `${env.os} · ${env.deviceType}` : '검사 시작을 누르면 이 브라우저를 진단합니다.'}</p>
            </div>
            <div className="fc-head-badges">
              {env && <span className={'fc-pill ' + (env.secure ? 'ok' : 'warn')}>{env.secure ? 'Secure Context' : 'Not Secure'}</span>}
              <span className={'fc-pill ' + (phase === 'done' ? 'ok' : phase === 'running' ? 'run' : '')}>
                {phase === 'done' ? 'Completed' : phase === 'running' ? 'Running' : 'Ready'}
              </span>
            </div>
          </div>
          <dl className="fc-env">
            <div>
              <dt>Viewport</dt>
              <dd className="mono">{val('viewport') ?? '—'}</dd>
            </div>
            <div>
              <dt>Device Pixel Ratio</dt>
              <dd className="mono">{val('dpr') ?? '—'}</dd>
            </div>
            <div>
              <dt>CPU Threads</dt>
              <dd className="mono">{val('cpu-threads')?.replace(' threads', '') ?? '—'}</dd>
            </div>
            <div>
              <dt>Language</dt>
              <dd className="mono">{val('language') ?? '—'}</dd>
            </div>
          </dl>

          <div className="fc-actions">
            <button className="btn" type="button" onClick={start} disabled={phase === 'running'}>
              {phase === 'running' ? `검사 중… ${done}/${TOTAL_CHECKS}` : phase === 'done' ? '다시 검사' : '검사 시작'}
            </button>
            <button className="btn btn-outline" type="button" onClick={exportJson} disabled={phase !== 'done'}>
              JSON 다운로드
            </button>
            {phase === 'done' && testedAt && (
              <span className="meta">
                {TOTAL_CHECKS}개 항목 · {(elapsed / 1000).toFixed(1)}초
              </span>
            )}
          </div>
          {phase === 'running' && (
            <div className="fc-progress" role="progressbar" aria-label="검사 진행률" aria-valuemin={0} aria-valuemax={TOTAL_CHECKS} aria-valuenow={done}>
              <span style={{ width: `${(done / TOTAL_CHECKS) * 100}%` }} />
            </div>
          )}
        </div>

        {/* ---------- 상태별 개수 ---------- */}
        <ul className="fc-counts" aria-label="상태별 항목 수">
          {STATUS_ORDER.map((s) => (
            <li key={s} className={s}>
              <b className="mono">{hasResults ? counts[s] : '—'}</b>
              <span>{STATUS_META[s].label}</span>
              <small>{STATUS_META[s].ko}</small>
            </li>
          ))}
        </ul>
        <p className="meta fc-score-note">
          점수는 브라우저의 우열이 아니라 지원 범위를 보여 주는 보조 지표입니다. 카테고리 막대는 N/A를 뺀 항목 중 PASS · INFO 비율입니다.
        </p>

        {/* ---------- 카테고리별 결과 ---------- */}
        <div className="fc-toolbar">
          <h2 className="fc-title">Category Results</h2>
          <span className="spacer" />
          <Segmented<Filter>
            name="fc-filter"
            label="표시할 항목"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: '전체' },
              { value: 'issues', label: '문제 항목만' },
            ]}
          />
          <button className="btn btn-ghost btn-sm" type="button" onClick={() => setAll(true)}>
            모두 펼치기
          </button>
          <button className="btn btn-ghost btn-sm" type="button" onClick={() => setAll(false)}>
            모두 접기
          </button>
        </div>

        <div className="fc-cats">
          {CATEGORIES.map((cat, ci) => {
            const ids = cat.checks.map((c) => c.id);
            const sc = catScore(ids, results);
            const finished = ids.every((id) => results[id]);
            const items = cat.checks.filter((c) => filter === 'all' || (results[c.id] && ISSUE.includes(results[c.id].status)));
            return (
              <details
                key={cat.id}
                className="fc-cat"
                open={!!open[cat.id]}
                onToggle={(e) => {
                  const v = (e.currentTarget as HTMLDetailsElement).open;
                  if (v !== !!open[cat.id]) setOpen((s) => ({ ...s, [cat.id]: v }));
                }}
              >
                <summary>
                  <span className="fc-cat-name">
                    <span className="mono fc-cat-no">{pad2(ci + 1)}</span> {cat.name}
                    <small>{cat.ko}</small>
                  </span>
                  <span className="fc-cat-score mono">{finished || sc.total ? `${sc.ok}/${sc.total}` : `${cat.checks.length}개`}</span>
                  <span className="fc-bar" aria-hidden="true">
                    <span style={{ width: sc.total ? `${(sc.ok / sc.total) * 100}%` : 0 }} />
                  </span>
                </summary>
                <ul className="fc-items">
                  {items.length === 0 && <li className="fc-empty meta">문제 항목이 없습니다.</li>}
                  {items.map((c) => {
                    const r = results[c.id];
                    return (
                      <li key={c.id}>
                        <details className="fc-item">
                          <summary>
                            <span className="fc-item-name">{c.name}</span>
                            <span className="fc-item-val mono">{r?.value ?? ''}</span>
                            <Badge status={r ? r.status : 'pending'} />
                          </summary>
                          <dl className="fc-detail">
                            <dt>검사 결과</dt>
                            <dd>
                              {r ? (
                                <>
                                  {STATUS_META[r.status].label} — {STATUS_META[r.status].ko}
                                  {r.note && <span className="fc-note">{r.note}</span>}
                                </>
                              ) : (
                                '아직 검사하지 않았습니다.'
                              )}
                            </dd>
                            <dt>검사 방법</dt>
                            <dd className="fc-method">{c.method}</dd>
                            <dt>설명</dt>
                            <dd>{c.desc}</dd>
                            {c.ref && (
                              <>
                                <dt>참고</dt>
                                <dd>
                                  <a href={c.ref} target="_blank" rel="noopener noreferrer">
                                    MDN 문서 ↗
                                  </a>
                                </dd>
                              </>
                            )}
                          </dl>
                        </details>
                      </li>
                    );
                  })}
                </ul>
              </details>
            );
          })}
        </div>

        <p className="meta" style={{ marginTop: 16 }}>
          모든 검사는 이 브라우저 안에서만 실행되며 결과는 서버로 전송되지 않습니다. 카메라 · 마이크 · 위치 같은 권한은 요청하지 않고 현재 상태만 읽습니다. 저장소 검사에 쓴 임시 데이터는 바로 지웁니다.
        </p>
      </div>
    </section>
  );
}
