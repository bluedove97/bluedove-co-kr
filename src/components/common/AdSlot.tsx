'use client';

import { useEffect, useRef } from 'react';
import { ADSENSE_CLIENT, ADSENSE_POSITIONS, ADSENSE_SLOTS, type AdPosition } from '@/lib/site';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/**
 * Google AdSense 광고 자리
 * - ADSENSE_POSITIONS[position] 이 false 면 아무것도 출력하지 않음
 * - ADSENSE_CLIENT 가 비어 있으면 빈 자리만 남김 (CSS 로 숨김 처리: html.ads-enabled 일 때만 표시)
 * - 값이 있으면 <ins class="adsbygoogle"> 를 그리고 push
 */
export default function AdSlot({ position }: { position: AdPosition }) {
  const on = ADSENSE_POSITIONS[position];
  const slot = ADSENSE_SLOTS[position];
  const enabled = Boolean(on && ADSENSE_CLIENT && slot);
  const pushed = useRef(false);

  useEffect(() => {
    if (!enabled || pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* 광고 차단기 등 */
    }
  }, [enabled]);

  if (!on) return null;

  return (
    <div className="ad-slot" data-ad-slot={position} aria-label="광고">
      {enabled && (
        <ins
          className="adsbygoogle"
          style={{ display: 'block' }}
          data-ad-client={ADSENSE_CLIENT}
          data-ad-slot={slot}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      )}
    </div>
  );
}
