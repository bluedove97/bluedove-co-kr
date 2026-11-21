'use client';

/* QR 코드 만들기 — URL/텍스트 · Wi-Fi · 연락처(vCard) · 전화/문자/이메일. 브라우저에서만 생성 (qrcode 패키지) */

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import type { QRCodeErrorCorrectionLevel } from 'qrcode';
import Segmented from '@/components/common/Segmented';
import StatusBox from '@/components/common/StatusBox';
import CopyButton from '@/components/common/CopyButton';
import { download, toast } from '@/utils/browser';
import { EMPTY_STATUS, type Status } from '@/types/common';

type Kind = 'text' | 'wifi' | 'vcard' | 'contact';
type ContactKind = 'tel' | 'sms' | 'email';
type WifiAuth = 'WPA' | 'WEP' | 'nopass';

const KINDS: { value: Kind; label: string }[] = [
  { value: 'text', label: 'URL / 텍스트' },
  { value: 'wifi', label: 'Wi-Fi 접속' },
  { value: 'vcard', label: '연락처 (vCard)' },
  { value: 'contact', label: '전화 / 문자 / 이메일' },
];

const EMPTY_VCARD = { last: '', first: '', org: '', title: '', mobile: '', work: '', email: '', url: '', addr: '', note: '' };
type VCard = typeof EMPTY_VCARD;

/* ---------- 내용 → QR 문자열 ---------- */

/** Wi-Fi QR 규격(ZXing): \ ; , : " 앞에 \ */
const wifiEsc = (s: string) => s.replace(/([\\;,:"])/g, '\\$1');
/** vCard 3.0 텍스트 값: \ , ; 줄바꿈 escape */
const vEsc = (s: string) => s.replace(/\\/g, '\\\\').replace(/([,;])/g, '\\$1').replace(/\r?\n/g, '\\n');
const telClean = (s: string) => s.replace(/[^\d+]/g, '');

function buildWifi(ssid: string, auth: WifiAuth, pass: string, hidden: boolean): string {
  let s = `WIFI:T:${auth};S:${wifiEsc(ssid)};`;
  if (auth !== 'nopass') s += `P:${wifiEsc(pass)};`;
  if (hidden) s += 'H:true;';
  return s + ';';
}

function buildVCard(v: VCard): string {
  const t = (k: keyof VCard) => v[k].trim();
  const fn = [t('last'), t('first')].filter(Boolean).join(' ') || t('org');
  const lines = ['BEGIN:VCARD', 'VERSION:3.0', `N:${vEsc(t('last'))};${vEsc(t('first'))};;;`, `FN:${vEsc(fn)}`];
  if (t('org')) lines.push(`ORG:${vEsc(t('org'))}`);
  if (t('title')) lines.push(`TITLE:${vEsc(t('title'))}`);
  if (t('mobile')) lines.push(`TEL;TYPE=CELL:${telClean(t('mobile'))}`);
  if (t('work')) lines.push(`TEL;TYPE=WORK:${telClean(t('work'))}`);
  if (t('email')) lines.push(`EMAIL:${t('email')}`);
  if (t('url')) lines.push(`URL:${t('url')}`);
  if (t('addr')) lines.push(`ADR;TYPE=WORK:;;${vEsc(t('addr'))};;;;`);
  if (t('note')) lines.push(`NOTE:${vEsc(t('note'))}`);
  lines.push('END:VCARD');
  return lines.join('\r\n');
}

function buildMailto(to: string, subject: string, body: string): string {
  const q = [subject && 'subject=' + encodeURIComponent(subject), body && 'body=' + encodeURIComponent(body)].filter(Boolean).join('&');
  return 'mailto:' + to.trim() + (q ? '?' + q : '');
}

/* ---------- 색 대비 (WCAG 상대 휘도) ---------- */
function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

/* ---------- 입력 칸 ---------- */
function Field({
  id,
  label,
  optional,
  children,
  full,
}: {
  id: string;
  label: string;
  optional?: boolean;
  children: ReactNode;
  full?: boolean;
}) {
  return (
    <div className={'field' + (full ? ' qr-full' : '')}>
      <label className="label" htmlFor={id}>
        {label} {optional && <span className="hint">(선택)</span>}
      </label>
      {children}
    </div>
  );
}

export default function QrTool() {
  const [kind, setKind] = useState<Kind>('text');

  /* 양식 값 */
  const [text, setText] = useState('');
  const [ssid, setSsid] = useState('');
  const [auth, setAuth] = useState<WifiAuth>('WPA');
  const [wpass, setWpass] = useState('');
  const [hidden, setHidden] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [vc, setVc] = useState<VCard>(EMPTY_VCARD);
  const [ck, setCk] = useState<ContactKind>('tel');
  const [phone, setPhone] = useState('');
  const [smsBody, setSmsBody] = useState('');
  const [mailTo, setMailTo] = useState('');
  const [mailSub, setMailSub] = useState('');
  const [mailBody, setMailBody] = useState('');
  const [invalid, setInvalid] = useState<Record<string, boolean>>({});

  /* 출력 옵션 */
  const [size, setSize] = useState(320);
  const [margin, setMargin] = useState(4);
  const [fg, setFg] = useState('#000000');
  const [bg, setBg] = useState('#ffffff');
  const [ecl, setEcl] = useState<QRCodeErrorCorrectionLevel>('M');

  /* 결과 */
  const [payload, setPayload] = useState('');
  const [status, setStatus] = useState<Status>(EMPTY_STATUS);
  const [version, setVersion] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const setV = (k: keyof VCard) => (e: { target: { value: string } }) => {
    const value = e.target.value;
    setVc((s) => ({ ...s, [k]: value }));
    if (invalid['vc-name'] && (k === 'last' || k === 'first' || k === 'org') && value.trim()) setInvalid({});
  };
  const clearInvalid = (id: string, v: string) => {
    if (invalid[id] && v.trim()) setInvalid((s) => ({ ...s, [id]: false }));
  };

  const ratio = (() => {
    const a = luminance(fg);
    const b = luminance(bg);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  })();
  const inverted = luminance(fg) > luminance(bg);

  /** 현재 양식에서 QR 문자열을 만든다. 필수 칸이 비면 null */
  function buildPayload(): string | null {
    const need = (pairs: [string, string][]): boolean => {
      const bad: Record<string, boolean> = {};
      pairs.forEach(([id, v]) => {
        if (!v.trim()) bad[id] = true;
      });
      setInvalid(bad);
      const first = pairs.find(([id]) => bad[id]);
      if (first) {
        toast('필수 항목을 입력하세요');
        document.getElementById(first[0])?.focus();
        return false;
      }
      return true;
    };
    switch (kind) {
      case 'text':
        return need([['qr-text', text]]) ? text : null;
      case 'wifi':
        return need(auth === 'nopass' ? [['wf-ssid', ssid]] : [['wf-ssid', ssid], ['wf-pass', wpass]]) ? buildWifi(ssid, auth, wpass, hidden) : null;
      case 'vcard':
        return need([['vc-name', vc.last + vc.first + vc.org]]) ? buildVCard(vc) : null;
      case 'contact':
        if (ck === 'tel') return need([['ct-phone', phone]]) ? 'tel:' + telClean(phone) : null;
        if (ck === 'sms') return need([['ct-phone', phone]]) ? `SMSTO:${telClean(phone)}:${smsBody}` : null;
        return need([['ct-mail', mailTo]]) ? buildMailto(mailTo, mailSub, mailBody) : null;
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const p = buildPayload();
    if (p != null) setPayload(p);
  }

  function onReset(e: FormEvent) {
    e.preventDefault();
    resetForm();
  }

  /** 양식 입력값과 생성 결과를 비운다 (출력 옵션은 유지) */
  function resetForm() {
    setText('');
    setSsid('');
    setAuth('WPA');
    setWpass('');
    setHidden(false);
    setVc(EMPTY_VCARD);
    setPhone('');
    setSmsBody('');
    setMailTo('');
    setMailSub('');
    setMailBody('');
    setCk('tel');
    setShowPass(false);
    setInvalid({});
    setPayload('');
    setVersion(null);
    setStatus(EMPTY_STATUS);
  }

  const qrOpts = { errorCorrectionLevel: ecl, margin, width: size, color: { dark: fg, light: bg } };

  /* 생성된 내용 또는 출력 옵션이 바뀌면 다시 그린다 */
  useEffect(() => {
    if (!payload) return;
    let alive = true;
    (async () => {
      try {
        const QR = (await import('qrcode')).default;
        if (!alive || !canvasRef.current) return;
        await QR.toCanvas(canvasRef.current, payload, qrOpts);
        const v = QR.create(payload, { errorCorrectionLevel: ecl }).version;
        if (!alive) return;
        setVersion(v);
        setStatus({ kind: 'ok', text: `QR 코드를 만들었습니다 · 버전 ${v} (${17 + v * 4}×${17 + v * 4} 모듈) · ${new TextEncoder().encode(payload).length} byte` });
      } catch (err) {
        if (!alive) return;
        setVersion(null);
        const msg = err instanceof Error ? err.message : String(err);
        setStatus({
          kind: 'err',
          text: /too big/i.test(msg) ? '내용이 너무 길어 QR 코드 하나에 담을 수 없습니다. 내용을 줄이거나 오류 정정 레벨을 낮춰 보세요.' : 'QR 코드를 만들지 못했습니다: ' + msg,
        });
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload, size, margin, fg, bg, ecl]);

  const ready = !!payload && version != null;
  const fileBase = 'qrcode-' + kind;

  function savePng() {
    const c = canvasRef.current;
    if (!c || !ready) return;
    c.toBlob((b) => {
      if (b) download(b, fileBase + '.png');
      else toast('PNG 저장에 실패했습니다');
    }, 'image/png');
  }

  async function saveSvg() {
    if (!ready) return;
    const QR = (await import('qrcode')).default;
    const svg = await QR.toString(payload, { ...qrOpts, type: 'svg' });
    download(svg, fileBase + '.svg', 'image/svg+xml;charset=utf-8');
  }

  const inv = (id: string) => invalid[id] || undefined;

  return (
    <section className="tool">
      <div className="wrap qr-layout">
        <form className="qr-form" noValidate onSubmit={onSubmit} onReset={onReset}>
          <div className="field">
            <label className="label" htmlFor="qr-kind">
              QR 코드 종류
            </label>
            <select
              className="select"
              id="qr-kind"
              value={kind}
              onChange={(e) => {
                setKind(e.target.value as Kind);
                resetForm();
              }}
            >
              {KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
          </div>

          <div className="surface-white qr-fields">
            {kind === 'text' && (
              <Field id="qr-text" label="URL 또는 텍스트" full>
                <textarea
                  className="textarea qr-textarea"
                  id="qr-text"
                  placeholder="https://bluedove.co.kr/"
                  value={text}
                  aria-invalid={inv('qr-text')}
                  onChange={(e) => (setText(e.target.value), clearInvalid('qr-text', e.target.value))}
                />
                <span className="hint">링크는 https:// 까지 넣어야 스캔했을 때 바로 열립니다.</span>
              </Field>
            )}

            {kind === 'wifi' && (
              <>
                <Field id="wf-ssid" label="네트워크 이름 (SSID)" full>
                  <input className="input" id="wf-ssid" autoComplete="off" placeholder="MyHome_5G" value={ssid} aria-invalid={inv('wf-ssid')} onChange={(e) => (setSsid(e.target.value), clearInvalid('wf-ssid', e.target.value))} />
                </Field>
                <div className="field qr-full">
                  <span className="label" id="wf-auth-label">
                    보안 방식
                  </span>
                  <Segmented<WifiAuth>
                    name="wf-auth"
                    labelledBy="wf-auth-label"
                    value={auth}
                    onChange={(v) => (setAuth(v), setInvalid({}))}
                    options={[
                      { value: 'WPA', label: 'WPA/WPA2/WPA3' },
                      { value: 'WEP', label: 'WEP' },
                      { value: 'nopass', label: '암호 없음' },
                    ]}
                  />
                </div>
                {auth !== 'nopass' && (
                  <Field id="wf-pass" label="비밀번호" full>
                    <div className="input-group">
                      <input
                        className="input"
                        id="wf-pass"
                        type={showPass ? 'text' : 'password'}
                        autoComplete="off"
                        value={wpass}
                        aria-invalid={inv('wf-pass')}
                        onChange={(e) => (setWpass(e.target.value), clearInvalid('wf-pass', e.target.value))}
                      />
                      <button className="btn btn-outline" type="button" aria-pressed={showPass} onClick={() => setShowPass((s) => !s)}>
                        {showPass ? '숨기기' : '보기'}
                      </button>
                    </div>
                  </Field>
                )}
                <div className="field qr-full">
                  <label className="check">
                    <input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} /> 숨겨진 네트워크 (SSID 브로드캐스트 안 함)
                  </label>
                </div>
              </>
            )}

            {kind === 'vcard' && (
              <>
                <Field id="vc-name" label="성">
                  <input className="input" id="vc-name" autoComplete="family-name" placeholder="홍" value={vc.last} aria-invalid={inv('vc-name')} onChange={setV('last')} />
                </Field>
                <Field id="vc-first" label="이름">
                  <input className="input" id="vc-first" autoComplete="given-name" placeholder="길동" value={vc.first} aria-invalid={inv('vc-name')} onChange={setV('first')} />
                </Field>
                <Field id="vc-org" label="회사" optional>
                  <input className="input" id="vc-org" autoComplete="organization" value={vc.org} onChange={setV('org')} />
                </Field>
                <Field id="vc-title" label="직함" optional>
                  <input className="input" id="vc-title" autoComplete="organization-title" value={vc.title} onChange={setV('title')} />
                </Field>
                <Field id="vc-mobile" label="휴대전화" optional>
                  <input className="input" id="vc-mobile" type="tel" inputMode="tel" autoComplete="tel" placeholder="010-1234-5678" value={vc.mobile} onChange={setV('mobile')} />
                </Field>
                <Field id="vc-work" label="회사 전화" optional>
                  <input className="input" id="vc-work" type="tel" inputMode="tel" placeholder="02-123-4567" value={vc.work} onChange={setV('work')} />
                </Field>
                <Field id="vc-email" label="이메일" optional>
                  <input className="input" id="vc-email" type="email" inputMode="email" autoComplete="email" value={vc.email} onChange={setV('email')} />
                </Field>
                <Field id="vc-url" label="웹사이트" optional>
                  <input className="input" id="vc-url" type="url" inputMode="url" placeholder="https://" value={vc.url} onChange={setV('url')} />
                </Field>
                <Field id="vc-addr" label="주소" optional full>
                  <input className="input" id="vc-addr" autoComplete="street-address" value={vc.addr} onChange={setV('addr')} />
                </Field>
                <Field id="vc-note" label="메모" optional full>
                  <input className="input" id="vc-note" value={vc.note} onChange={setV('note')} />
                </Field>
                <p className="hint qr-full">성 · 이름 · 회사 중 하나는 입력해야 합니다.</p>
              </>
            )}

            {kind === 'contact' && (
              <>
                <div className="field qr-full">
                  <span className="label" id="ct-kind-label">
                    연결할 동작
                  </span>
                  <Segmented<ContactKind>
                    name="ct-kind"
                    labelledBy="ct-kind-label"
                    value={ck}
                    onChange={(v) => (setCk(v), setInvalid({}))}
                    options={[
                      { value: 'tel', label: '전화 걸기' },
                      { value: 'sms', label: '문자 보내기' },
                      { value: 'email', label: '이메일 쓰기' },
                    ]}
                  />
                </div>
                {ck !== 'email' && (
                  <Field id="ct-phone" label="전화번호" full>
                    <input className="input" id="ct-phone" type="tel" inputMode="tel" placeholder="010-1234-5678" value={phone} aria-invalid={inv('ct-phone')} onChange={(e) => (setPhone(e.target.value), clearInvalid('ct-phone', e.target.value))} />
                  </Field>
                )}
                {ck === 'sms' && (
                  <Field id="ct-sms" label="문자 내용" optional full>
                    <textarea className="textarea qr-textarea-sm" id="ct-sms" value={smsBody} onChange={(e) => setSmsBody(e.target.value)} />
                  </Field>
                )}
                {ck === 'email' && (
                  <>
                    <Field id="ct-mail" label="받는 사람 이메일" full>
                      <input className="input" id="ct-mail" type="email" inputMode="email" placeholder="name@example.com" value={mailTo} aria-invalid={inv('ct-mail')} onChange={(e) => (setMailTo(e.target.value), clearInvalid('ct-mail', e.target.value))} />
                    </Field>
                    <Field id="ct-sub" label="제목" optional full>
                      <input className="input" id="ct-sub" value={mailSub} onChange={(e) => setMailSub(e.target.value)} />
                    </Field>
                    <Field id="ct-body" label="본문" optional full>
                      <textarea className="textarea qr-textarea-sm" id="ct-body" value={mailBody} onChange={(e) => setMailBody(e.target.value)} />
                    </Field>
                  </>
                )}
              </>
            )}
          </div>

          <div className="btn-row">
            <button className="btn" type="submit">
              QR 코드 생성
            </button>
            <button className="btn btn-outline" type="reset">
              초기화
            </button>
          </div>
          <p className="meta">입력한 내용은 서버로 전송되지 않고 이 브라우저 안에서만 QR 코드로 바뀝니다.</p>
        </form>

        <div className="qr-side">
          <div className="qr-preview" aria-live="polite">
            <canvas ref={canvasRef} className="qr-canvas" hidden={!ready} role="img" aria-label="생성된 QR 코드" />
            {!ready && <p className="qr-empty">양식을 채우고 &lsquo;QR 코드 생성&rsquo;을 누르면 여기에 나타납니다.</p>}
          </div>
          <StatusBox status={status} />
          {ratio < 3 && <StatusBox status={{ kind: 'warn', text: `전경과 배경의 대비가 낮습니다 (${ratio.toFixed(1)}:1). 스캔이 잘 안 될 수 있습니다.` }} />}
          {inverted && ratio >= 3 && <StatusBox status={{ kind: 'warn', text: '전경이 배경보다 밝습니다. 일부 스캐너는 반전된 QR 코드를 읽지 못합니다.' }} />}

          <div className="btn-row">
            <button className="btn" type="button" disabled={!ready} onClick={savePng}>
              PNG 다운로드
            </button>
            <button className="btn btn-outline" type="button" disabled={!ready} onClick={saveSvg}>
              SVG 다운로드
            </button>
          </div>

          <div className="surface qr-options">
            <div className="field">
              <label className="label" htmlFor="qr-size">
                크기 <span className="hint mono">{size}px</span>
              </label>
              <input className="range" id="qr-size" type="range" min={128} max={1024} step={32} value={size} onChange={(e) => setSize(Number(e.target.value))} />
            </div>
            <div className="field">
              <label className="label" htmlFor="qr-margin">
                여백 <span className="hint mono">{margin}칸</span>
              </label>
              <input className="range" id="qr-margin" type="range" min={0} max={10} step={1} value={margin} onChange={(e) => setMargin(Number(e.target.value))} />
            </div>
            <div className="qr-colors">
              <div className="field">
                <label className="label" htmlFor="qr-fg">
                  전경색
                </label>
                <div className="qr-color">
                  <input id="qr-fg" type="color" value={fg} onChange={(e) => setFg(e.target.value)} />
                  <span className="mono">{fg}</span>
                </div>
              </div>
              <div className="field">
                <label className="label" htmlFor="qr-bg">
                  배경색
                </label>
                <div className="qr-color">
                  <input id="qr-bg" type="color" value={bg} onChange={(e) => setBg(e.target.value)} />
                  <span className="mono">{bg}</span>
                </div>
              </div>
            </div>
            <div className="field">
              <span className="label" id="qr-ecl-label">
                오류 정정 레벨
              </span>
              <Segmented<QRCodeErrorCorrectionLevel>
                name="qr-ecl"
                labelledBy="qr-ecl-label"
                value={ecl}
                onChange={setEcl}
                options={[
                  { value: 'L', label: 'L 7%' },
                  { value: 'M', label: 'M 15%' },
                  { value: 'Q', label: 'Q 25%' },
                  { value: 'H', label: 'H 30%' },
                ]}
              />
            </div>
            <button
              className="btn btn-ghost btn-sm"
              type="button"
              onClick={() => {
                setSize(320);
                setMargin(4);
                setFg('#000000');
                setBg('#ffffff');
                setEcl('M');
              }}
            >
              옵션 기본값으로
            </button>
          </div>

          {ready && (
            <div>
              <div className="pane-head">
                <span className="label">QR에 담긴 내용</span>
                <CopyButton value={payload} />
              </div>
              <pre className="output wrap-text qr-payload">{payload}</pre>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
