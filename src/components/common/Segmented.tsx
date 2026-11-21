'use client';

import { Fragment } from 'react';

/** 라디오 버튼 세그먼트 (.seg) — input + label 이 형제로 붙어야 CSS(:checked + label) 가 동작 */
export default function Segmented<T extends string>({
  name,
  value,
  onChange,
  options,
  label,
  labelledBy,
}: {
  name: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label?: string;
  labelledBy?: string;
}) {
  return (
    <div className="seg" role="radiogroup" aria-label={label} aria-labelledby={labelledBy}>
      {options.map((o) => {
        const id = `${name}-${o.value.replace(/[^a-z0-9]/gi, '-')}`;
        return (
          <Fragment key={o.value}>
            <input type="radio" name={name} id={id} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} />
            <label htmlFor={id}>{o.label}</label>
          </Fragment>
        );
      })}
    </div>
  );
}
