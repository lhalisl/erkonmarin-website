import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { buildScene } from './scene';
import { MONO } from './textures';
import type { Live } from './textures';

export interface StageOptions {
  canvas: HTMLCanvasElement;
  host: HTMLElement; // sticky viewport, used for sizing and visibility
  annotations: HTMLElement;
  hud: HTMLElement | null;
  reduced: boolean;
}

export interface StageHandle {
  setProgress(p: number): void;
  dispose(): void;
}

interface Annotation {
  ch: number;
  key: string;
  title: string;
  sub: string;
}

const ANNOTATIONS: Annotation[] = [
  { ch: 1, key: 'consoleScreen', title: 'Alarm & izleme', sub: 'AMS ekranı' },
  { ch: 1, key: 'consoleButtons', title: 'Kumanda devreleri', sub: 'Konsol I/O' },
  { ch: 2, key: 'acb1', title: 'ACB', sub: 'Hava devre kesici' },
  { ch: 2, key: 'synchro', title: 'Senkronoskop', sub: 'Paralel çalışma' },
  { ch: 2, key: 'mimic', title: 'Bara mimiği', sub: '440 V ana bara' },
  { ch: 3, key: 'plc', title: 'PLC', sub: 'CPU ve I/O modülleri' },
  { ch: 3, key: 'terminals', title: 'Klemensler', sub: 'Saha bağlantıları' },
  { ch: 3, key: 'hmi', title: 'HMI', sub: 'Operatör paneli' },
  { ch: 4, key: 'acb2', title: 'Çekmeceli kesici', sub: 'Servis konumunda' },
];

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export async function createStage(o: StageOptions): Promise<StageHandle> {
  // Canvas text needs the web fonts; don't wait forever for them.
  await Promise.race([
    Promise.all([document.fonts.load(`500 16px ${MONO}`), document.fonts.load('600 16px "Archivo Variable"')]),
    new Promise((r) => setTimeout(r, 1500)),
  ]);

  const renderer = new THREE.WebGLRenderer({
    canvas: o.canvas,
    antialias: false,
    alpha: false,
    stencil: false,
    powerPreference: 'high-performance',
  });
  const small = Math.min(window.innerWidth, window.innerHeight) < 700;
  let pixelRatio = Math.min(window.devicePixelRatio || 1, small ? 1.5 : 1.75);
  renderer.setPixelRatio(pixelRatio);
  renderer.setClearColor(0x070d22, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x070d22);
  scene.fog = new THREE.Fog(0x070d22, 8.5, 21);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = envRT.texture;
  scene.environmentIntensity = 0.18;

  const built = buildScene();
  scene.add(built.root);

  // Lighting: overhead fluorescent strips, a warm key from the right, cyan floor wash
  RectAreaLightUniformsLib.init();
  scene.add(new THREE.HemisphereLight(0x9cbcff, 0x0a0f1e, 0.28));
  const strip = (x: number, z: number, w: number, lookX: number, lookZ: number, i: number) => {
    const l = new THREE.RectAreaLight(0xe9f1ff, i, w, 0.45);
    l.position.set(x, 3.0, z);
    l.lookAt(lookX, 0.9, lookZ);
    scene.add(l);
  };
  strip(0, 1.6, 6.4, 0, 0.1, 1.4);
  strip(-4.1, 2.4, 2.6, -4.2, 1.3, 1.2);
  strip(3.3, 2.4, 2.6, 3.6, 1.0, 1.2);
  const key = new THREE.SpotLight(0xffe4c4, 26, 22, 0.5, 0.85, 1.6);
  key.position.set(5.5, 4.6, 7);
  key.target.position.set(-0.6, 1.1, 0);
  scene.add(key, key.target);
  const wash = new THREE.PointLight(0x2bbbe5, 3, 6, 1.6);
  wash.position.set(0.2, 0.2, 1.25);
  scene.add(wash);

  /* ---------------- camera path ---------------- */
  const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 60);
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const fc = built.focus.console;
  const fa = built.focus.autoPair;
  const side = (n: THREE.Vector3, s: number) => V(n.z, 0, -n.x).multiplyScalar(s);
  const KF = [
    { pos: V(3.0, 1.45, 4.6), tgt: V(-1.0, 1.2, 0.15), fov: 40 },
    { pos: fc.target.clone().addScaledVector(fc.normal, 2.45).add(V(0, 0.48, 0)).add(side(fc.normal, -0.4)), tgt: fc.target.clone().add(V(0, 0.02, 0)), fov: 36 },
    { pos: V(0.15, 1.55, 2.6), tgt: V(-0.95, 1.42, 0.3), fov: 36 },
    { pos: fa.target.clone().addScaledVector(fa.normal, 2.35).add(V(0, 0.2, 0)).add(side(fa.normal, 0.25)), tgt: fa.target.clone(), fov: 36 },
    { pos: V(0.45, 1.6, 1.95), tgt: V(-1.2, 1.08, 0.42), fov: 38 },
  ];
  const last = KF.length - 1;

  const desiredPos = new THREE.Vector3();
  const desiredTgt = new THREE.Vector3();
  const camPos = KF[0].pos.clone();
  const camTgt = KF[0].tgt.clone();
  let camFov = KF[0].fov;
  let progress = 0;
  // ?snap disables camera easing (used for visual checks and poster renders)
  const snap = new URLSearchParams(location.search).has('snap');

  const sample = (p: number) => {
    const c = Math.min(last, Math.max(0, p));
    const i = Math.min(last - 1, Math.floor(c));
    const f = smooth(0.18, 0.82, c - i);
    desiredPos.lerpVectors(KF[i].pos, KF[i + 1].pos, f);
    desiredTgt.lerpVectors(KF[i].tgt, KF[i + 1].tgt, f);
    return THREE.MathUtils.lerp(KF[i].fov, KF[i + 1].fov, f);
  };

  /* ---------------- post ---------------- */
  const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.6, 0.45, 1.05);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  /* ---------------- sizing ---------------- */
  let W = 1;
  let H = 1;
  let shiftX = 0;
  let shiftY = 0;
  const resize = () => {
    const r = o.host.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width));
    H = Math.max(1, Math.round(r.height));
    renderer.setSize(W, H, false);
    composer.setPixelRatio(pixelRatio);
    composer.setSize(W, H);
    camera.aspect = W / H;
    // keep the equipment clear of the copy: right side on desktop, upper half on phones
    const desktop = W >= 960;
    shiftX = desktop ? -W * 0.2 : 0;
    shiftY = desktop ? 0 : H * 0.24;
    camera.setViewOffset(W, H, shiftX, shiftY, W, H);
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(o.host);
  resize();

  /* ---------------- pointer parallax ---------------- */
  const pointer = new THREE.Vector2();
  const pointerSmoothed = new THREE.Vector2();
  const onPointer = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    pointer.set((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
  };
  if (!o.reduced) window.addEventListener('pointermove', onPointer, { passive: true });

  /* ---------------- annotations ---------------- */
  const annos = ANNOTATIONS.filter((a) => built.anchors[a.key]).map((a) => {
    const el = document.createElement('div');
    el.className = 'anno';
    el.innerHTML = `<i class="anno__dot"></i><span class="anno__line"></span><span class="anno__body"><b></b><span></span></span>`;
    el.querySelector('b')!.textContent = a.title;
    el.querySelector('.anno__body span')!.textContent = a.sub;
    o.annotations.appendChild(el);
    return { ...a, el, obj: built.anchors[a.key], shown: false };
  });
  const tmp = new THREE.Vector3();
  const placeAnnotations = () => {
    for (const a of annos) {
      const vis = 1 - smooth(0.22, 0.48, Math.abs(progress - a.ch));
      if (vis < 0.01) {
        if (a.shown) {
          a.el.style.opacity = '0';
          a.shown = false;
        }
        continue;
      }
      a.obj.getWorldPosition(tmp);
      tmp.project(camera);
      const x = (tmp.x * 0.5 + 0.5) * W;
      const y = (-tmp.y * 0.5 + 0.5) * H;
      if (tmp.z > 1 || x < 24 || x > W - 24 || y < 90 || y > H - 40) {
        if (a.shown) {
          a.el.style.opacity = '0';
          a.shown = false;
        }
        continue;
      }
      a.el.style.opacity = String(vis);
      a.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      a.el.dataset.side = x > W * 0.78 ? 'l' : 'r';
      a.shown = true;
    }
  };

  /* ---------------- HUD ---------------- */
  const hud = o.hud
    ? {
        v: o.hud.querySelector<HTMLElement>('[data-hud="v"]'),
        hz: o.hud.querySelector<HTMLElement>('[data-hud="hz"]'),
        load: o.hud.querySelector<HTMLElement>('[data-hud="load"]'),
        bar: o.hud.querySelector<HTMLElement>('[data-hud="bar"]'),
      }
    : null;
  let hudAcc = 1;

  /* ---------------- loop ---------------- */
  const live: Live = { load: 0.62, dg1: 312, dg2: 298, hz: 60, volts: 440, t: 0 };
  let lastTime = performance.now();
  let t = 0;
  let raf = 0;
  let visible = true;
  let firstFrame = true;
  let frames = 0;
  let frameTime = 0;
  let quality = 2;

  const step = () => {
    raf = requestAnimationFrame(step);
    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;
    t += dt;
    const lt = o.reduced ? 12 : t;
    live.t = lt;
    live.load = 0.6 + 0.04 * Math.sin(lt * 0.13) + 0.015 * Math.sin(lt * 0.71);
    live.dg1 = 600 * live.load * 0.86 + Math.sin(lt * 0.9) * 4;
    live.dg2 = 600 * live.load * 0.82 + Math.sin(lt * 1.1 + 1) * 4;
    live.hz = 60 + Math.sin(lt * 0.37) * 0.08 + Math.sin(lt * 1.3) * 0.03;
    live.volts = 440 + Math.sin(lt * 0.29) * 1.6;

    const rackOut = smooth(3.25, 3.95, progress);
    built.update(t, dt, { progress, rackOut, reduced: o.reduced, live });

    const fov = sample(progress);
    const k = firstFrame || snap ? 1 : 1 - Math.exp(-dt * (o.reduced ? 10 : 3.4));
    camPos.lerp(desiredPos, k);
    camTgt.lerp(desiredTgt, k);
    camFov += (fov - camFov) * k;
    pointerSmoothed.lerp(pointer, 1 - Math.exp(-dt * 2.5));

    camera.position.copy(camPos);
    if (!o.reduced) {
      const right = tmp.set(1, 0, 0).applyQuaternion(camera.quaternion);
      camera.position.addScaledVector(right, pointerSmoothed.x * 0.16 + Math.sin(t * 0.21) * 0.05);
      camera.position.y += -pointerSmoothed.y * 0.07 + Math.sin(t * 0.17) * 0.025;
    }
    camera.lookAt(camTgt);
    if (Math.abs(camera.fov - camFov) > 0.001) {
      camera.fov = camFov;
      camera.updateProjectionMatrix();
    }

    composer.render(dt);
    placeAnnotations();

    hudAcc += dt;
    if (hud && hudAcc > 0.25) {
      hudAcc = 0;
      if (hud.v) hud.v.textContent = live.volts.toFixed(0);
      if (hud.hz) hud.hz.textContent = live.hz.toFixed(1);
      if (hud.load) hud.load.textContent = String(Math.round(live.load * 100));
      if (hud.bar) hud.bar.style.transform = `scaleX(${live.load.toFixed(3)})`;
    }

    if (firstFrame) {
      firstFrame = false;
      o.host.classList.add('is-live');
    }

    // Adaptive quality: step down once if the device struggles
    if (quality > 0 && frames < 120) {
      frames++;
      if (frames > 20) frameTime += dt;
      if (frames === 120) {
        const avg = frameTime / 100;
        if (avg > 0.034) {
          quality--;
          pixelRatio = Math.max(1, pixelRatio * 0.7);
          renderer.setPixelRatio(pixelRatio);
          resize();
          if (avg > 0.05) {
            quality--;
            bloom.enabled = false;
          }
          frames = 0;
          frameTime = 0;
        }
      }
    }
  };

  const start = () => {
    if (raf || !visible || document.hidden) return;
    lastTime = performance.now();
    raf = requestAnimationFrame(step);
  };
  const stop = () => {
    cancelAnimationFrame(raf);
    raf = 0;
  };

  const io = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      visible ? start() : stop();
    },
    { rootMargin: '100px' },
  );
  io.observe(o.host);
  const onVis = () => (document.hidden ? stop() : start());
  document.addEventListener('visibilitychange', onVis);

  sample(0);
  camPos.copy(desiredPos);
  camTgt.copy(desiredTgt);
  start();

  return {
    setProgress(p: number) {
      progress = p;
    },
    dispose() {
      stop();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pointermove', onPointer);
      annos.forEach((a) => a.el.remove());
      built.dispose();
      envRT.dispose();
      pmrem.dispose();
      rt.dispose();
      composer.dispose();
      renderer.dispose();
    },
  };
}
