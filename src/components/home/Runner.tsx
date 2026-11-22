'use client';

/**
 * 메인 러너 — pixi.html 컨셉 유지
 * 캐릭터가 달리고, 화면을 누르면 점프하면서 다음 프로젝트 이력을 보여 준다.
 * PixiJS v3 + pixi-spine (public/js/pixi/) 을 전역 스크립트로 불러와 사용.
 */

import { useEffect, useRef, useState } from 'react';
import { HISTORY, HISTORY_END } from '@/data/history';
import { loadScript } from '@/utils/loadScript';
import { pad2 } from '@/utils/format';

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    PIXI?: any;
  }
}

const TILE_W = 2156; // 배경 타일 원본 폭
const TILE_H = 284;
const AUTO_FIRST = 5000; // 원본: 처음엔 5초 간격
const AUTO_AFTER_TAP = 10000; // 원본: 터치 후엔 10초 간격

type Card = { period: string; name: string; accent: number } | null;

const ITEMS = [...HISTORY, { period: '', name: HISTORY_END }];
const TOTAL = ITEMS.length;

export default function Runner() {
  const stageRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [card, setCard] = useState<Card>(null);
  const [swap, setSwap] = useState(false);
  const [count, setCount] = useState('-- / --');
  const [paused, setPaused] = useState(false);

  // 이펙트 내부(애니메이션 루프)와 공유하는 가변 상태
  const ctl = useRef({ paused: false, tap: () => {},startAuto: (_ms: number) => {}, stopAuto: () => {} });

  useEffect(() => {
    const stageEl = stageRef.current;
    if (!stageEl) return;
    let disposed = false;
    let raf = 0;
    let autoTimer: ReturnType<typeof setInterval> | undefined;
    let swapTimer: ReturnType<typeof setTimeout> | undefined;
    let rz: ReturnType<typeof setTimeout> | undefined;
    let renderer: any = null;
    let stage: any = null;
    let pixie: any = null;
    let bg1: any = null;
    let bg2: any = null;
    let idx = 0;
    let visible = true;
    let position = 0;
    let lastT = 0;
    let bgScale = 1;
    let width = stageEl.clientWidth || 360;
    let height = stageEl.clientHeight || TILE_H;

    function showItem(i: number) {
      const it = ITEMS[i];
      setSwap(true);
      clearTimeout(swapTimer);
      swapTimer = setTimeout(() => {
        setCard({ period: it.period, name: it.name, accent: Math.floor(Math.random() * 4) });
        setSwap(false);
      }, 140);
      setCount(it.period ? pad2(i + 1) + ' / ' + pad2(TOTAL - 1) : 'END');
    }
    function next() {
      idx = idx % TOTAL;
      showItem(idx);
      idx++;
    }
    function startAuto(interval: number) {
      clearInterval(autoTimer);
      if (ctl.current.paused) return;
      autoTimer = setInterval(next, interval);
    }
    function stopAuto() {
      clearInterval(autoTimer);
    }
    function tap() {
      if (!pixie) return;
      next();
      if (!ctl.current.paused) startAuto(AUTO_AFTER_TAP);
      pixie.state.setAnimationByName(0, 'jump', false);
      pixie.state.addAnimationByName(0, 'running', true, 0);
    }
    ctl.current.tap = tap;
    ctl.current.startAuto = startAuto;
    ctl.current.stopAuto = stopAuto;

    function layout() {
      if (!renderer) return;
      width = stageEl!.clientWidth || width;
      height = stageEl!.clientHeight || height;
      renderer.resize(width, height);
      bgScale = height / TILE_H;
      if (bg1) {
        bg1.scale.set(bgScale);
        bg2.scale.set(bgScale);
      }
      if (pixie) {
        const small = width < 640;
        const s = small ? 0.24 : 0.3;
        pixie.scale.set(s * bgScale);
        pixie.position.x = small ? Math.max(70, width * 0.17) : Math.min(width / 6, 220);
        pixie.position.y = height - 30 * bgScale;
      }
    }

    function wrapX(x: number) {
      const span = TILE_W * bgScale;
      x %= span * 2;
      if (x < 0) x += span * 2;
      return x - span;
    }

    function animate(t: number) {
      raf = requestAnimationFrame(animate);
      if (!visible) {
        lastT = t;
        return;
      }
      if (ctl.current.paused) {
        lastT = t;
        renderer.render(stage);
        return;
      }
      const dt = lastT ? Math.min(t - lastT, 50) : 16.7;
      lastT = t;
      // 원본: 프레임당 10px, 배경은 0.6배 속도
      position += 10 * (dt / 16.7) * Math.max(bgScale, 0.8);
      const span = TILE_W * bgScale;
      if (bg1) {
        bg1.position.x = wrapX(-(position * 0.6));
        bg2.position.x = wrapX(-(position * 0.6) + span);
      }
      if (pixie) pixie.update(dt / 1000);
      renderer.render(stage);
    }

    function onAssets(spineData: any) {
      const PIXI = window.PIXI;
      const bgLayer = new PIXI.Container();
      stage.addChild(bgLayer);
      const tex = PIXI.Texture.fromImage('/js/pixi/iP4_BGtile4.jpg');
      bg1 = new PIXI.Sprite(tex);
      bg2 = new PIXI.Sprite(tex);
      bgLayer.addChild(bg1);
      bgLayer.addChild(bg2);

      pixie = new PIXI.spine.Spine(spineData);
      pixie.autoUpdate = false; // 일시정지·탭 전환 대응을 위해 시간은 animate()에서 직접 진행
      stage.addChild(pixie);
      pixie.stateData.setMixByName('running', 'jump', 0.2);
      pixie.stateData.setMixByName('jump', 'running', 0.4);
      pixie.state.setAnimationByName(0, 'running', true);

      layout();
      setLoading(false);
      setCount('00 / ' + pad2(TOTAL - 1));
      startAuto(AUTO_FIRST);
      raf = requestAnimationFrame(animate);
    }

    loadScript('/js/pixi/pixi.js')
      .then(() => loadScript('/js/pixi/pixi-spine.js'))
      .then(() => {
        if (disposed) return;
        const PIXI = window.PIXI;
        if (PIXI.utils) PIXI.utils._saidHello = true;
        renderer = PIXI.autoDetectRenderer(width, height, {
          resolution: Math.min(window.devicePixelRatio || 1, 2),
          antialias: true,
        });
        renderer.view.setAttribute('aria-hidden', 'true');
        stageEl.insertBefore(renderer.view, stageEl.firstChild);
        stage = new PIXI.Container();

        // PIXI.loader 는 전역 싱글턴 — 다른 페이지 갔다 돌아온 경우 이미 로드된 리소스를 재사용
        const loaded = PIXI.loader.resources.pixie;
        if (loaded && loaded.spineData) onAssets(loaded.spineData);
        else if (!loaded) PIXI.loader.add('pixie', '/js/pixi/Pixie.json').load((_l: any, res: any) => !disposed && onAssets(res.pixie.spineData));
        else PIXI.loader.once('complete', (_l: any, res: any) => !disposed && onAssets(res.pixie.spineData));
      })
      .catch((err) => {
        console.error('[Runner]', err);
        if (disposed) return;
        setLoading(false);
        setCount('로드 실패');
      });

    const io =
      'IntersectionObserver' in window
        ? new IntersectionObserver((entries) => {
            visible = entries[0].isIntersecting;
          })
        : null;
    io?.observe(stageEl);

    const onVis = () => {
      if (document.hidden) stopAuto();
      else if (!ctl.current.paused && pixie) startAuto(AUTO_AFTER_TAP);
    };
    const onResize = () => {
      clearTimeout(rz);
      rz = setTimeout(layout, 120);
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('resize', onResize);

    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      ctl.current.paused = true;
      setPaused(true);
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      clearInterval(autoTimer);
      clearTimeout(swapTimer);
      clearTimeout(rz);
      io?.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('resize', onResize);
      try {
        // destroy(true) 는 자식 Sprite 의 텍스처까지 파괴한다. 텍스처는 PIXI 전역 캐시(TextureCache ·
        // loader.resources 의 spine 아틀라스)에 남아 다시 들어올 때 재사용되므로 자식만 떼어 내고 파괴하지 않는다.
        if (stage) {
          stage.removeChildren();
          stage.destroy();
        }
        if (renderer) {
          renderer.view.remove();
          renderer.destroy();
        }
      } catch {
        /* 이미 해제된 경우 */
      }
    };
  }, []);

  function togglePause() {
    const p = !ctl.current.paused;
    ctl.current.paused = p;
    setPaused(p);
    if (p) ctl.current.stopAuto();
    else ctl.current.startAuto(AUTO_AFTER_TAP);
  }

  return (
    <figure className="runner">
      <div
        className="runner-stage"
        id="runner"
        ref={stageRef}
        role="button"
        tabIndex={0}
        aria-label="개발 이력 러너. 누르면 캐릭터가 점프하고 다음 프로젝트를 보여 줍니다."
        onPointerDown={(e) => {
          if (e.button !== undefined && e.button !== 0) return;
          ctl.current.tap();
        }}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            ctl.current.tap();
          }
        }}
      >
        <div className="runner-loading" hidden={!loading}>
          Loading…
        </div>
        <div className={'runner-card' + (swap ? ' swap' : '')} aria-live="polite" data-accent={card ? String(card.accent) : undefined}>
          {card ? (
            <>
              {card.period && <span className="runner-period mono">{card.period}</span>}
              <strong className="runner-name">{card.name}</strong>
            </>
          ) : (
            <>
              <span className="runner-period mono">Bluedove&apos;s</span>
              <strong className="runner-name">Development History</strong>
              <span className="runner-hint">화면을 터치하세요</span>
            </>
          )}
        </div>
      </div>
      <figcaption className="runner-bar">
        <span className="runner-count mono">{count}</span>
        <span className="runner-help">캐릭터를 눌러보세요.</span>
        <button className="btn btn-sm btn-outline" type="button" aria-pressed={paused} onClick={togglePause}>
          {paused ? '다시 달리기' : '일시정지'}
        </button>
      </figcaption>
    </figure>
  );
}
