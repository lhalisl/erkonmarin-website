import type { StageHandle } from './engine';

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function initStage() {
  const root = document.querySelector<HTMLElement>('[data-stage]');
  if (!root) return;
  const host = root.querySelector<HTMLElement>('[data-stage-viewport]')!;
  const canvas = root.querySelector<HTMLCanvasElement>('[data-stage-canvas]')!;
  const annotations = root.querySelector<HTMLElement>('[data-stage-annotations]')!;
  const hud = root.querySelector<HTMLElement>('[data-stage-hud]');
  const steps = Array.from(root.querySelectorAll<HTMLElement>('[data-step]'));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // ?force3d runs the scene even on software rendering (screenshots, debugging)
  const force = new URLSearchParams(location.search).has('force3d');
  // Set by the inline check in Stage.astro: no WebGL2, a software renderer, or Data Saver
  const staticMode = document.documentElement.hasAttribute('data-stage-static');

  let engine: StageHandle | null = null;
  let failed = false;
  let tops: number[] = [];
  let progress = 0;

  const measure = () => {
    const sy = window.scrollY;
    tops = steps.map((s) => s.getBoundingClientRect().top + sy);
  };

  const compute = () => {
    const y = window.scrollY;
    let p = 0;
    for (let i = 0; i < tops.length - 1; i++) {
      if (y >= tops[i]) p = i + Math.min(1, (y - tops[i]) / Math.max(1, tops[i + 1] - tops[i]));
    }
    return p;
  };

  const apply = () => {
    progress = compute();
    steps.forEach((s, i) => {
      const vis = 1 - smooth(0.32, 0.6, Math.abs(progress - i));
      s.style.setProperty('--vis', vis.toFixed(3));
      s.toggleAttribute('data-active', vis > 0.5);
    });
    engine?.setProgress(progress);
  };

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      apply();
    });
  };

  measure();
  apply();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => {
    measure();
    apply();
  });
  document.fonts?.ready.then(() => {
    measure();
    apply();
  });

  if (staticMode) {
    root.classList.add('is-static');
    return;
  }

  const boot = () =>
    import('./engine')
      .then(({ createStage }) =>
        createStage({
          canvas,
          host,
          annotations,
          hud,
          reduced,
          force,
          onFail: () => {
            failed = true;
            root.classList.add('is-static');
            host.classList.remove('is-live');
            engine?.dispose();
            engine = null;
          },
        }),
      )
      .then((h) => {
        if (failed) return h.dispose();
        engine = h;
        engine.setProgress(progress);
      })
      .catch((err) => {
        console.warn('[stage] 3D disabled:', err);
        root.classList.add('is-static');
      });

  const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
  if (document.readyState === 'complete') {
    idle ? idle(boot, { timeout: 1200 }) : setTimeout(boot, 200);
  } else {
    window.addEventListener('load', () => (idle ? idle(boot, { timeout: 1200 }) : setTimeout(boot, 200)), { once: true });
  }
}
