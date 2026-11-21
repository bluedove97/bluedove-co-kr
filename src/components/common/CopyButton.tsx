'use client';

import { copyText } from '@/utils/browser';

type Props = {
  /** 복사할 값 (호출 시점에 계산하려면 함수로 전달) */
  value: string | (() => string);
  label?: string;
  className?: string;
};

export default function CopyButton({ value, label = '복사', className = 'btn btn-ghost btn-sm' }: Props) {
  return (
    <button className={className} type="button" onClick={() => copyText(typeof value === 'function' ? value() : value)}>
      {label}
    </button>
  );
}
