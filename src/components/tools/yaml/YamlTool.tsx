'use client';

import yaml from 'js-yaml';
import { useState } from 'react';
import StatusBox from '@/components/common/StatusBox';
import { copyText } from '@/utils/browser';
import { sortDeep } from '@/utils/format';
import { EMPTY_STATUS, type Status } from '@/types/common';

const SAMPLE_JSON = JSON.stringify(
  {
    apiVersion: 'apps/v1',
    kind: 'Deployment',
    metadata: { name: 'playground', labels: { app: 'playground' } },
    spec: {
      replicas: 2,
      selector: { matchLabels: { app: 'playground' } },
      template: {
        metadata: { labels: { app: 'playground' } },
        spec: { containers: [{ name: 'web', image: 'nginx:1.27', ports: [{ containerPort: 80 }] }] },
      },
    },
  },
  null,
  2,
);
const SAMPLE_YAML = [
  'services:',
  '  web:',
  '    image: nginx:1.27',
  '    ports:',
  '      - "8080:80"',
  '    environment: &env',
  '      TZ: Asia/Seoul',
  '  api:',
  '    build: ./api',
  '    environment: *env   # 앵커 재사용',
  '    depends_on: [web]',
  '',
].join('\n');

function jsonErrorLoc(msg: string, text: string): string {
  let m = /line (\d+) column (\d+)/i.exec(msg);
  if (m) return m[1] + '번째 줄, ' + m[2] + '번째 칸';
  m = /position (\d+)/i.exec(msg);
  if (m) {
    const before = text.slice(0, +m[1]).split('\n');
    return before.length + '번째 줄, ' + (before[before.length - 1].length + 1) + '번째 칸';
  }
  return '';
}

export default function YamlTool() {
  const [jsonText, setJsonText] = useState('');
  const [yamlText, setYamlText] = useState('');
  const [indent, setIndent] = useState(2);
  const [multiDoc, setMultiDoc] = useState(false);
  const [sortKeys, setSortKeys] = useState(false);
  const [jsonInvalid, setJsonInvalid] = useState(false);
  const [yamlInvalid, setYamlInvalid] = useState(false);
  const [status, setStatus] = useState<Status>(EMPTY_STATUS);

  function toYaml(text = jsonText) {
    if (!text.trim()) {
      setStatus({ kind: 'warn', text: 'JSON 칸이 비어 있습니다.' });
      return;
    }
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch (e) {
      setJsonInvalid(true);
      const msg = (e as Error).message;
      const loc = jsonErrorLoc(msg, text);
      setStatus({
        kind: 'err',
        text: (
          <>
            <strong>JSON 오류</strong> — {msg}
            {loc && <> <span className="mono">({loc})</span></>}
          </>
        ),
      });
      return;
    }
    setJsonInvalid(false);
    const opts: yaml.DumpOptions = { indent, lineWidth: -1, noRefs: true, sortKeys };
    const out = multiDoc && Array.isArray(data) ? data.map((d) => yaml.dump(d, opts)).join('---\n') : yaml.dump(data, opts);
    setYamlText(out);
    setYamlInvalid(false);
    setStatus({ kind: 'ok', text: 'JSON → YAML 변환 완료 (' + out.split('\n').length + '줄)' });
  }

  function toJson(text = yamlText) {
    if (!text.trim()) {
      setStatus({ kind: 'warn', text: 'YAML 칸이 비어 있습니다.' });
      return;
    }
    let docs: unknown[] = [];
    try {
      yaml.loadAll(text, (d) => {
        docs.push(d);
      });
    } catch (e) {
      setYamlInvalid(true);
      const err = e as yaml.YAMLException;
      setStatus({
        kind: 'err',
        text: (
          <>
            <strong>YAML 오류</strong> — {err.reason || err.message}
            {err.mark && (
              <>
                {' '}
                <span className="mono">
                  ({err.mark.line + 1}번째 줄, {err.mark.column + 1}번째 칸)
                </span>
              </>
            )}
          </>
        ),
      });
      return;
    }
    setYamlInvalid(false);
    docs = docs.filter((d) => d !== undefined);
    let data: unknown = docs.length > 1 ? docs : docs[0];
    if (data === undefined) data = null;
    if (sortKeys) data = sortDeep(data);
    try {
      setJsonText(JSON.stringify(data, (_k, v) => (v instanceof Date ? v.toISOString() : v), indent));
    } catch (e) {
      setStatus({
        kind: 'err',
        text: (
          <>
            <strong>JSON으로 표현할 수 없는 값</strong> — {(e as Error).message}
          </>
        ),
      });
      return;
    }
    setJsonInvalid(false);
    setStatus({ kind: 'ok', text: 'YAML → JSON 변환 완료' + (docs.length > 1 ? ' (문서 ' + docs.length + '개 → 배열)' : '') });
  }

  return (
    <section className="tool">
      <div className="wrap">
        <div className="toolbar" role="group" aria-label="변환 옵션">
          <label className="inline-field">
            들여쓰기
            <select className="select select-sm" value={indent} onChange={(e) => setIndent(Number(e.target.value))}>
              <option value="2">2칸</option>
              <option value="4">4칸</option>
            </select>
          </label>
          <label className="check">
            <input type="checkbox" checked={multiDoc} onChange={(e) => setMultiDoc(e.target.checked)} /> JSON 배열을 여러 YAML 문서로 나누기 (---)
          </label>
          <label className="check">
            <input type="checkbox" checked={sortKeys} onChange={(e) => setSortKeys(e.target.checked)} /> 키 이름순 정렬
          </label>
        </div>

        <div className="yaml-grid">
          <div className="field">
            <div className="pane-head">
              <label className="label" htmlFor="json-pane">
                JSON
              </label>
              <div className="btn-row">
                <button
                  className="btn btn-ghost btn-sm"
                  type="button"
                  onClick={() => {
                    setJsonText(SAMPLE_JSON);
                    toYaml(SAMPLE_JSON);
                  }}
                >
                  예시
                </button>
                <button className="btn btn-ghost btn-sm" type="button" onClick={() => copyText(jsonText)}>
                  복사
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  type="button"
                  onClick={() => {
                    setJsonText('');
                    setJsonInvalid(false);
                    setStatus(EMPTY_STATUS);
                  }}
                >
                  지우기
                </button>
              </div>
            </div>
            <textarea
              id="json-pane"
              className="textarea code-area"
              rows={20}
              spellCheck={false}
              autoComplete="off"
              autoCapitalize="off"
              placeholder='{"apiVersion":"v1","kind":"Service"}'
              value={jsonText}
              aria-invalid={jsonInvalid || undefined}
              onChange={(e) => setJsonText(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  e.preventDefault();
                  toYaml();
                }
              }}
            />
          </div>

          <div className="yaml-actions" role="group" aria-label="변환 방향">
            <button className="btn" type="button" aria-label="JSON을 YAML로 변환" onClick={() => toYaml()}>
              JSON → YAML
            </button>
            <button className="btn" type="button" aria-label="YAML을 JSON으로 변환" onClick={() => toJson()}>
              YAML → JSON
            </button>
          </div>

          <div className="field">
            <div className="pane-head">
              <label className="label" htmlFor="yaml-pane">
                YAML
              </label>
              <div className="btn-row">
                <button
                  className="btn btn-ghost btn-sm"
                  type="button"
                  onClick={() => {
                    setYamlText(SAMPLE_YAML);
                    toJson(SAMPLE_YAML);
                  }}
                >
                  예시
                </button>
                <button className="btn btn-ghost btn-sm" type="button" onClick={() => copyText(yamlText)}>
                  복사
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  type="button"
                  onClick={() => {
                    setYamlText('');
                    setYamlInvalid(false);
                    setStatus(EMPTY_STATUS);
                  }}
                >
                  지우기
                </button>
              </div>
            </div>
            <textarea
              id="yaml-pane"
              className="textarea code-area"
              rows={20}
              spellCheck={false}
              autoComplete="off"
              autoCapitalize="off"
              placeholder={'apiVersion: v1\nkind: Service'}
              value={yamlText}
              aria-invalid={yamlInvalid || undefined}
              onChange={(e) => setYamlText(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  e.preventDefault();
                  toJson();
                }
              }}
            />
          </div>
        </div>
        <StatusBox status={status} style={{ marginTop: 16 }} />
      </div>
    </section>
  );
}
