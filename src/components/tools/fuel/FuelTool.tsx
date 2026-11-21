'use client';

/* 연비 계산기 — 리터당 km · 금액당 km · 주유비 예상 */

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { TabList, tabPanelProps } from '@/components/common/Tabs';
import { store, toast } from '@/utils/browser';

type Tab = 'l' | 'w' | 'c';

const num = (s: string) => {
  const v = parseFloat(s);
  return isFinite(v) && v > 0 ? v : null;
};
const f = (n: number, d: number) => n.toLocaleString('ko-KR', { minimumFractionDigits: d, maximumFractionDigits: d });
const U = ({ children }: { children: ReactNode }) => <small>{children}</small>;

function grade(kmpl: number): string {
  if (kmpl >= 20) return '하이브리드 수준의 매우 좋은 연비입니다.';
  if (kmpl >= 15) return '좋은 연비입니다.';
  if (kmpl >= 10) return '보통 수준의 연비입니다.';
  if (kmpl >= 7) return '대형차·SUV에서 흔한 연비입니다.';
  return '연비가 낮은 편입니다. 시내 정체나 급가속이 많았는지 확인해 보세요.';
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{children}</div>
    </div>
  );
}

function UnitInput({
  id,
  label,
  unit,
  value,
  onChange,
  placeholder,
  invalid,
  inputMode = 'decimal',
}: {
  id: string;
  label: ReactNode;
  unit: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  invalid?: boolean;
  inputMode?: 'decimal' | 'numeric';
}) {
  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <div className="unit-input">
        <input
          className="input"
          id={id}
          type="number"
          inputMode={inputMode}
          min={0}
          step="any"
          placeholder={placeholder}
          value={value}
          aria-invalid={invalid || undefined}
          onChange={(e) => onChange(e.target.value)}
        />
        <span className="unit">{unit}</span>
      </div>
    </div>
  );
}

/** 제출 시 비어 있거나 0 이하인 필수 칸 표시 */
function useRequired() {
  const [invalid, setInvalid] = useState<Record<string, boolean>>({});
  function check(fields: [string, string][]): boolean {
    const bad: Record<string, boolean> = {};
    fields.forEach(([id, v]) => {
      if (!(parseFloat(v) > 0)) bad[id] = true;
    });
    setInvalid(bad);
    const first = fields.find(([id]) => bad[id]);
    if (first) {
      toast('0보다 큰 값을 입력하세요');
      document.getElementById(first[0])?.focus();
      return false;
    }
    return true;
  }
  function clear(id: string, v: string) {
    if (invalid[id] && parseFloat(v) > 0) setInvalid((s) => ({ ...s, [id]: false }));
  }
  return { invalid, check, clear, reset: () => setInvalid({}) };
}

export default function FuelTool() {
  const [tab, setTab] = useState<Tab>('l');
  // 유가는 세 탭 공유 + 브라우저에 기억
  const [price, setPriceState] = useState('');
  useEffect(() => {
    setPriceState(store.get('fuel-price', ''));
  }, []);
  const setPrice = (v: string) => {
    setPriceState(v);
    store.set('fuel-price', v);
  };

  /* 리터당 */
  const [lDist, setLDist] = useState('');
  const [lFuel, setLFuel] = useState('');
  const lReq = useRequired();
  const ld = num(lDist);
  const ll = num(lFuel);
  const lp = num(price);
  const kmpl = ld && ll ? ld / ll : null;

  /* 금액당 */
  const [wDist, setWDist] = useState('');
  const [wMoney, setWMoney] = useState('');
  const wReq = useRequired();
  const wd = num(wDist);
  const wm = num(wMoney);
  const wLiter = wd && wm && lp ? wm / lp : null;

  /* 예상 */
  const [cDist, setCDist] = useState('');
  const [cEff, setCEff] = useState('');
  const [cRound, setCRound] = useState(false);
  const cReq = useRequired();
  const cd = num(cDist);
  const ce = num(cEff);
  const cTotal = cd && ce ? cd * (cRound ? 2 : 1) : null;
  const cLiter = cTotal && ce ? cTotal / ce : null;

  const submit = (fn: () => boolean) => (e: FormEvent) => {
    e.preventDefault();
    fn();
  };

  const buttons = (
    <div className="btn-row" style={{ marginTop: 16 }}>
      <button className="btn" type="submit">
        계산하기
      </button>
      <button className="btn btn-outline" type="reset">
        초기화
      </button>
    </div>
  );

  return (
    <section className="tool">
      <div className="wrap">
        <TabList
          base="fuel"
          label="계산 방식"
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'l', label: '리터당 km (연비)' },
            { id: 'w', label: '금액당 km' },
            { id: 'c', label: '주유비 예상' },
          ]}
        />

        {/* 리터당 */}
        <form
          {...tabPanelProps('fuel', 'l', tab)}
          noValidate
          onSubmit={submit(() =>
            lReq.check([
              ['l-dist', lDist],
              ['l-fuel', lFuel],
            ]),
          )}
          onReset={(e) => {
            e.preventDefault();
            setLDist('');
            setLFuel('');
            lReq.reset();
          }}
        >
          <div className="grid-2" style={{ gap: 16 }}>
            <UnitInput id="l-dist" label="주행거리" unit="km" placeholder="550" value={lDist} invalid={lReq.invalid['l-dist']} onChange={(v) => (setLDist(v), lReq.clear('l-dist', v))} />
            <UnitInput id="l-fuel" label="주유량 (소모한 연료)" unit="L" placeholder="42.5" value={lFuel} invalid={lReq.invalid['l-fuel']} onChange={(v) => (setLFuel(v), lReq.clear('l-fuel', v))} />
            <UnitInput
              id="l-price"
              label={
                <>
                  리터당 유가 <span className="hint">(선택)</span>
                </>
              }
              unit="원/L"
              placeholder="1650"
              value={price}
              onChange={setPrice}
            />
          </div>
          {buttons}
          <div className="stat-row fuel-out" style={{ marginTop: 20 }} aria-live="polite">
            <Stat label="연비">
              {kmpl ? (
                <>
                  {f(kmpl, 2)}
                  <U>km/L</U>
                </>
              ) : (
                '-'
              )}
            </Stat>
            <Stat label="100km당 연료">
              {kmpl ? (
                <>
                  {f(100 / kmpl, 2)}
                  <U>L</U>
                </>
              ) : (
                '-'
              )}
            </Stat>
            <Stat label="km당 연료비">
              {kmpl && lp ? (
                <>
                  {f(lp / kmpl, 1)}
                  <U>원</U>
                </>
              ) : (
                '-'
              )}
            </Stat>
            <Stat label="이번 주유 금액">
              {kmpl && lp && ll ? (
                <>
                  {f(Math.round(lp * ll), 0)}
                  <U>원</U>
                </>
              ) : (
                '-'
              )}
            </Stat>
          </div>
          <p className="meta fuel-grade" style={{ marginTop: 10 }}>
            {kmpl ? grade(kmpl) : ''}
          </p>
        </form>

        {/* 금액당 */}
        <form
          {...tabPanelProps('fuel', 'w', tab)}
          noValidate
          onSubmit={submit(() =>
            wReq.check([
              ['w-dist', wDist],
              ['w-money', wMoney],
              ['w-price', price],
            ]),
          )}
          onReset={(e) => {
            e.preventDefault();
            setWDist('');
            setWMoney('');
            wReq.reset();
          }}
        >
          <div className="grid-2" style={{ gap: 16 }}>
            <UnitInput id="w-dist" label="주행거리" unit="km" placeholder="550" value={wDist} invalid={wReq.invalid['w-dist']} onChange={(v) => (setWDist(v), wReq.clear('w-dist', v))} />
            <UnitInput
              id="w-money"
              label="주유 금액"
              unit="원"
              placeholder="70000"
              inputMode="numeric"
              value={wMoney}
              invalid={wReq.invalid['w-money']}
              onChange={(v) => (setWMoney(v), wReq.clear('w-money', v))}
            />
            <UnitInput id="w-price" label="리터당 유가" unit="원/L" placeholder="1650" value={price} invalid={wReq.invalid['w-price']} onChange={(v) => (setPrice(v), wReq.clear('w-price', v))} />
          </div>
          {buttons}
          <div className="stat-row fuel-out" style={{ marginTop: 20 }} aria-live="polite">
            <Stat label="1,000원당">
              {wd && wm ? (
                <>
                  {f((wd / wm) * 1000, 2)}
                  <U>km</U>
                </>
              ) : (
                '-'
              )}
            </Stat>
            <Stat label="10,000원당">
              {wd && wm ? (
                <>
                  {f((wd / wm) * 10000, 1)}
                  <U>km</U>
                </>
              ) : (
                '-'
              )}
            </Stat>
            <Stat label="km당 연료비">
              {wd && wm ? (
                <>
                  {f(wm / wd, 1)}
                  <U>원</U>
                </>
              ) : (
                '-'
              )}
            </Stat>
            <Stat label="넣은 연료 (환산)">
              {wLiter ? (
                <>
                  {f(wLiter, 2)}
                  <U>L</U>
                </>
              ) : (
                '-'
              )}
            </Stat>
            <Stat label="연비 (환산)">
              {wLiter && wd ? (
                <>
                  {f(wd / wLiter, 2)}
                  <U>km/L</U>
                </>
              ) : (
                '-'
              )}
            </Stat>
          </div>
        </form>

        {/* 예상 */}
        <form
          {...tabPanelProps('fuel', 'c', tab)}
          noValidate
          onSubmit={submit(() =>
            cReq.check([
              ['c-dist', cDist],
              ['c-eff', cEff],
              ['c-price', price],
            ]),
          )}
          onReset={(e) => {
            e.preventDefault();
            setCDist('');
            setCEff('');
            setCRound(false);
            cReq.reset();
          }}
        >
          <div className="grid-2" style={{ gap: 16 }}>
            <UnitInput id="c-dist" label="갈 거리 (편도)" unit="km" placeholder="400" value={cDist} invalid={cReq.invalid['c-dist']} onChange={(v) => (setCDist(v), cReq.clear('c-dist', v))} />
            <UnitInput id="c-eff" label="내 차 연비" unit="km/L" placeholder="12.5" value={cEff} invalid={cReq.invalid['c-eff']} onChange={(v) => (setCEff(v), cReq.clear('c-eff', v))} />
            <UnitInput id="c-price" label="리터당 유가" unit="원/L" placeholder="1650" value={price} invalid={cReq.invalid['c-price']} onChange={(v) => (setPrice(v), cReq.clear('c-price', v))} />
            <div className="field" style={{ justifyContent: 'flex-end' }}>
              <label className="check">
                <input type="checkbox" checked={cRound} onChange={(e) => setCRound(e.target.checked)} /> 왕복으로 계산
              </label>
            </div>
          </div>
          {buttons}
          <div className="stat-row fuel-out" style={{ marginTop: 20 }} aria-live="polite">
            <Stat label="총 거리">
              {cTotal ? (
                <>
                  {f(cTotal, 1)}
                  <U>km</U>
                </>
              ) : (
                '-'
              )}
            </Stat>
            <Stat label="필요한 연료">
              {cLiter ? (
                <>
                  {f(cLiter, 2)}
                  <U>L</U>
                </>
              ) : (
                '-'
              )}
            </Stat>
            <Stat label="예상 주유비">
              {cLiter && lp ? (
                <>
                  {f(Math.round(cLiter * lp), 0)}
                  <U>원</U>
                </>
              ) : (
                '-'
              )}
            </Stat>
          </div>
        </form>
        <p className="meta" style={{ marginTop: 16 }}>
          유가는 한 번 입력하면 이 브라우저에 기억되어 세 탭에 함께 쓰입니다.
        </p>
      </div>
    </section>
  );
}
