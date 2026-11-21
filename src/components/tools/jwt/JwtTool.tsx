'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import StatusBox from '@/components/common/StatusBox';
import { copyText, toast } from '@/utils/browser';
import { highlightJson } from '@/utils/format';
import { EMPTY_STATUS, type Status } from '@/types/common';

const enc = new TextEncoder();

function b64urlToBytes(s: string): Uint8Array<ArrayBuffer> {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function bytesToB64url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function decodePart(s: string, name: string): Record<string, unknown> {
  if (!/^[A-Za-z0-9_-]*$/.test(s)) throw new Error(name + ' 부분에 Base64URL이 아닌 문자가 있습니다.');
  const text = new TextDecoder().decode(b64urlToBytes(s));
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(name + ' 부분이 JSON이 아닙니다.');
  }
}

function fmtDate(sec: number): string {
  const d = new Date(sec * 1000);
  if (isNaN(d.getTime())) return '-';
  const kst = d.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  return kst + ' (KST)';
}
function relative(sec: number): string {
  const diff = sec - Date.now() / 1000;
  const a = Math.abs(diff);
  const t = a < 60 ? Math.round(a) + '초' : a < 3600 ? Math.round(a / 60) + '분' : a < 86400 ? (a / 3600).toFixed(1) + '시간' : (a / 86400).toFixed(1) + '일';
  return diff >= 0 ? t + ' 후' : t + ' 전';
}

const CLAIM_NAMES: Record<string, string> = { iss: '발급자', sub: '주체', aud: '대상', exp: '만료 시각', nbf: '유효 시작', iat: '발급 시각', jti: '토큰 ID' };

/* ---------- verification ---------- */
const HASH: Record<string, string> = { '256': 'SHA-256', '384': 'SHA-384', '512': 'SHA-512' };
const CURVE: Record<string, string> = { ES256: 'P-256', ES384: 'P-384', ES512: 'P-521' };

type AlgParams = { import: RsaHashedImportParams | HmacImportParams | EcKeyImportParams; verify: AlgorithmIdentifier | RsaPssParams | EcdsaParams };

function algParams(alg: string): AlgParams | null {
  const m = /^(HS|RS|PS|ES)(256|384|512)$/.exec(alg);
  if (!m) return null;
  const hash = HASH[m[2]];
  switch (m[1]) {
    case 'HS':
      return { import: { name: 'HMAC', hash }, verify: { name: 'HMAC' } };
    case 'RS':
      return { import: { name: 'RSASSA-PKCS1-v1_5', hash }, verify: { name: 'RSASSA-PKCS1-v1_5' } };
    case 'PS':
      return { import: { name: 'RSA-PSS', hash }, verify: { name: 'RSA-PSS', saltLength: Number(m[2]) / 8 } };
    default:
      return { import: { name: 'ECDSA', namedCurve: CURVE[alg] }, verify: { name: 'ECDSA', hash } };
  }
}

function pemToDer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

type Decoded = { header: Record<string, unknown>; payload: Record<string, unknown>; parts: string[] };

async function importKey(alg: string, params: AlgParams, keyText: string, b64Secret: boolean, header: Record<string, unknown>): Promise<CryptoKey> {
  const subtle = crypto.subtle;
  if (/^HS/.test(alg)) {
    const raw = b64Secret ? b64urlToBytes(keyText.trim().replace(/=+$/, '')) : enc.encode(keyText);
    return subtle.importKey('raw', raw, params.import, false, ['verify']);
  }
  const t = keyText.trim();
  if (t.charAt(0) === '{') {
    let jwk = JSON.parse(t);
    if (jwk.keys && Array.isArray(jwk.keys)) {
      const kid = header.kid;
      jwk = jwk.keys.filter((k: { kid?: string }) => (kid ? k.kid === kid : true))[0];
      if (!jwk) throw new Error('JWKS에서 kid "' + kid + '"에 해당하는 키를 찾지 못했습니다.');
    }
    const clean: Record<string, unknown> = { kty: jwk.kty, n: jwk.n, e: jwk.e, crv: jwk.crv, x: jwk.x, y: jwk.y, ext: true };
    Object.keys(clean).forEach((k) => {
      if (clean[k] === undefined) delete clean[k];
    });
    return subtle.importKey('jwk', clean as JsonWebKey, params.import, false, ['verify']);
  }
  if (/BEGIN RSA PUBLIC KEY/.test(t)) throw new Error('PKCS#1(BEGIN RSA PUBLIC KEY) 형식은 지원하지 않습니다. "openssl rsa -RSAPublicKey_in -pubout" 으로 SPKI 형식으로 바꿔 주세요.');
  if (/BEGIN CERTIFICATE/.test(t)) throw new Error('인증서 대신 공개키(BEGIN PUBLIC KEY)를 넣어 주세요. "openssl x509 -pubkey -noout -in cert.pem" 으로 추출할 수 있습니다.');
  if (/PRIVATE KEY/.test(t)) throw new Error('개인키는 넣지 마세요. 검증에는 공개키만 필요합니다.');
  if (!/BEGIN PUBLIC KEY/.test(t)) throw new Error('공개키는 PEM(-----BEGIN PUBLIC KEY-----) 또는 JWK(JSON) 형식이어야 합니다.');
  return subtle.importKey('spki', pemToDer(t), params.import, false, ['verify']);
}

function Claims({ payload }: { payload: Record<string, unknown> }) {
  const now = Date.now() / 1000;
  return (
    <tbody>
      {Object.keys(payload).map((k) => {
        const v = payload[k];
        let td: ReactNode;
        if ((k === 'exp' || k === 'iat' || k === 'nbf') && typeof v === 'number') {
          let badge: ReactNode = null;
          if (k === 'exp') badge = v < now ? <span className="claim-badge err">만료됨</span> : <span className="claim-badge ok">유효</span>;
          if (k === 'nbf') badge = v > now ? <span className="claim-badge warn">아직 무효</span> : <span className="claim-badge ok">시작됨</span>;
          td = (
            <td>
              <span className="mono">{v}</span>
              {badge}
              <br />
              {fmtDate(v)} · {relative(v)}
            </td>
          );
        } else {
          td = <td className="mono">{typeof v === 'string' ? v : JSON.stringify(v)}</td>;
        }
        return (
          <tr key={k}>
            <th>
              <span className="mono">{k}</span>
              {CLAIM_NAMES[k] && (
                <>
                  <br />
                  {CLAIM_NAMES[k]}
                </>
              )}
            </th>
            {td}
          </tr>
        );
      })}
    </tbody>
  );
}

export default function JwtTool() {
  const [token, setToken] = useState('');
  const [key, setKey] = useState('');
  const [b64Secret, setB64Secret] = useState(false);
  const [decoded, setDecoded] = useState<Decoded | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [status, setStatus] = useState<Status>(EMPTY_STATUS);
  const [vstatus, setVstatus] = useState<Status>(EMPTY_STATUS);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  function decode(text: string) {
    const raw = text.trim().replace(/^Bearer\s+/i, '');
    setVstatus(EMPTY_STATUS);
    if (!raw) {
      setDecoded(null);
      setStatus(EMPTY_STATUS);
      setInvalid(false);
      return;
    }
    const parts = raw.split('.');
    try {
      if (parts.length === 5) throw new Error('점이 4개인 JWE(암호화된 토큰)입니다. JWE는 키 없이 내용을 볼 수 없습니다.');
      if (parts.length !== 3) throw new Error('JWT는 점(.)으로 구분된 3부분이어야 합니다. 현재 ' + parts.length + '부분입니다.');
      const header = decodePart(parts[0], 'Header');
      const payload = decodePart(parts[1], 'Payload');
      setDecoded({ header, payload, parts });
      setInvalid(false);
      const msgs = ['디코딩 완료'];
      let kind: Status['kind'] = 'ok';
      if (typeof payload.exp === 'number' && payload.exp < Date.now() / 1000) {
        msgs.push('토큰이 만료되었습니다 (' + relative(payload.exp) + ')');
        kind = 'warn';
      }
      if (String(header.alg || '').toLowerCase() === 'none') {
        msgs.push('alg가 none인 서명 없는 토큰입니다. 실서비스에서는 거부해야 합니다.');
        kind = 'warn';
      }
      setStatus({ kind, text: msgs.join(' · ') });
    } catch (e) {
      setDecoded(null);
      setInvalid(true);
      setStatus({ kind: 'err', text: (e as Error).message });
    }
  }

  async function verify() {
    if (!decoded) return setVstatus({ kind: 'warn', text: '먼저 JWT를 입력하세요.' });
    if (!window.crypto || !crypto.subtle) return setVstatus({ kind: 'err', text: '이 브라우저(또는 http 환경)에서는 Web Crypto API를 쓸 수 없습니다.' });
    const alg = String(decoded.header.alg);
    const params = algParams(alg);
    if (!params) return setVstatus({ kind: 'err', text: '지원하지 않는 알고리즘입니다: ' + alg });
    if (!key.trim()) return setVstatus({ kind: 'warn', text: '키를 입력하세요.' });
    const data = enc.encode(decoded.parts[0] + '.' + decoded.parts[1]);
    let sig: Uint8Array<ArrayBuffer>;
    try {
      sig = b64urlToBytes(decoded.parts[2]);
    } catch {
      return setVstatus({ kind: 'err', text: '서명 부분을 디코딩할 수 없습니다.' });
    }
    try {
      const k = await importKey(alg, params, key, b64Secret, decoded.header);
      const ok = await crypto.subtle.verify(params.verify, k, sig, data);
      setVstatus(ok ? { kind: 'ok', text: '서명이 유효합니다 (' + alg + ')' } : { kind: 'err', text: '서명이 일치하지 않습니다. 키가 다르거나 토큰이 변조되었습니다.' });
    } catch (e) {
      setVstatus({ kind: 'err', text: '검증할 수 없습니다 — ' + ((e as Error)?.message || '키 형식을 확인하세요.') });
    }
  }

  /* ---------- sample (HS256 signed in-browser) ---------- */
  async function makeSample() {
    const secret = 'bluedove-playground-secret';
    const now = Math.floor(Date.now() / 1000);
    const h = bytesToB64url(enc.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
    const p = bytesToB64url(enc.encode(JSON.stringify({ sub: 'bluedove', name: 'Developer Playground', role: ['admin', 'dev'], iat: now, nbf: now, exp: now + 3600 })));
    if (!window.crypto || !crypto.subtle) {
      toast('Web Crypto API를 지원하지 않는 환경입니다');
      return;
    }
    const k = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const s = await crypto.subtle.sign('HMAC', k, enc.encode(h + '.' + p));
    const t = h + '.' + p + '.' + bytesToB64url(new Uint8Array(s));
    setToken(t);
    setKey(secret);
    setB64Secret(false);
    decode(t);
    toast('예시 토큰과 비밀키를 넣었습니다');
  }

  const alg = decoded ? String(decoded.header.alg || '(없음)') : '-';
  const isHmac = decoded ? /^HS/.test(String(decoded.header.alg || '')) : true;
  const headerJson = decoded ? JSON.stringify(decoded.header, null, 2) : '';
  const payloadJson = decoded ? JSON.stringify(decoded.payload, null, 2) : '';

  return (
    <section className="tool">
      <div className="wrap">
        <div className="grid-2">
          <div className="stack">
            <div className="field">
              <div className="pane-head">
                <label className="label" htmlFor="jwt-in">
                  JWT 토큰
                </label>
                <div className="btn-row">
                  <button className="btn btn-ghost btn-sm" type="button" onClick={makeSample}>
                    예시 토큰 만들기
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    type="button"
                    onClick={() => {
                      setToken('');
                      setKey('');
                      decode('');
                      inputRef.current?.focus();
                    }}
                  >
                    지우기
                  </button>
                </div>
              </div>
              <textarea
                id="jwt-in"
                ref={inputRef}
                className="textarea code-area"
                rows={8}
                spellCheck={false}
                autoComplete="off"
                autoCapitalize="off"
                style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature"
                value={token}
                aria-invalid={invalid || undefined}
                onChange={(e) => {
                  const v = e.target.value;
                  setToken(v);
                  clearTimeout(timer.current);
                  timer.current = setTimeout(() => decode(v), 150);
                }}
              />
            </div>
            <div className="jwt-colored mono" aria-hidden="true">
              {decoded && (
                <>
                  <span className="h">{decoded.parts[0]}</span>
                  <span className="d">.</span>
                  <span className="p">{decoded.parts[1]}</span>
                  <span className="d">.</span>
                  <span className="s">{decoded.parts[2]}</span>
                </>
              )}
            </div>
            <StatusBox status={status} />

            <div className="surface">
              <h2 className="subhead" style={{ fontSize: 18, marginBottom: 12 }}>
                서명 검증
              </h2>
              <p className="meta" style={{ marginBottom: 12 }}>
                알고리즘: <span className="mono">{alg}</span>
              </p>
              <div className="field">
                <label className="label" htmlFor="key-in">
                  {!decoded ? '비밀키 / 공개키' : isHmac ? '공유 비밀키 (secret)' : '공개키 (PEM 또는 JWK)'}
                </label>
                <textarea
                  id="key-in"
                  className="textarea code-area"
                  rows={5}
                  spellCheck={false}
                  autoComplete="off"
                  autoCapitalize="off"
                  style={{ minHeight: 120, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
                  placeholder={'HS256: 공유 비밀키 문자열\nRS256/ES256: -----BEGIN PUBLIC KEY----- 또는 JWK(JSON)'}
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                />
                <label className="check" hidden={!isHmac}>
                  <input type="checkbox" checked={b64Secret} onChange={(e) => setB64Secret(e.target.checked)} /> 비밀키가 Base64로 인코딩되어 있음
                </label>
              </div>
              <div className="btn-row" style={{ marginTop: 12 }}>
                <button className="btn" type="button" onClick={verify}>
                  서명 검증
                </button>
              </div>
              <StatusBox status={vstatus} style={{ marginTop: 12 }} />
            </div>
          </div>

          <div className="stack">
            <div className="field">
              <div className="pane-head">
                <span className="label jwt-h">Header</span>
                <button className="btn btn-ghost btn-sm" type="button" onClick={() => copyText(headerJson)}>
                  복사
                </button>
              </div>
              <pre className="output" tabIndex={0} style={{ minHeight: 90 }} aria-label="Header JSON" dangerouslySetInnerHTML={{ __html: headerJson ? highlightJson(headerJson) : '' }} />
            </div>
            <div className="field">
              <div className="pane-head">
                <span className="label jwt-p">Payload</span>
                <button className="btn btn-ghost btn-sm" type="button" onClick={() => copyText(payloadJson)}>
                  복사
                </button>
              </div>
              <pre className="output" tabIndex={0} style={{ minHeight: 160 }} aria-label="Payload JSON" dangerouslySetInnerHTML={{ __html: payloadJson ? highlightJson(payloadJson) : '' }} />
            </div>
            <div>
              <h2 className="subhead" style={{ fontSize: 18, marginBottom: 8 }}>
                클레임
              </h2>
              <table className="kv">
                {decoded ? (
                  <Claims payload={decoded.payload} />
                ) : (
                  <tbody>
                    <tr>
                      <td className="meta">토큰을 입력하면 표시됩니다.</td>
                    </tr>
                  </tbody>
                )}
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
