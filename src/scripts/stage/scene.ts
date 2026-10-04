import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import * as T from './textures';

/*
  Procedural engine-control-room set:
  - six-section main switchboard (DG1, DG2, SYNC, two feeder sections, SHORE)
  - ECR console with alarm and power-management screens
  - two automation cabinets, one with its door open on the PLC rack
  All dimensions in metres. Switchboard front face sits at z = 0.3.
*/

export interface SceneState {
  progress: number;
  rackOut: number; // 0..1, DG2 breaker withdrawal
  reduced: boolean;
  live: T.Live;
}

export interface Built {
  root: THREE.Group;
  anchors: Record<string, THREE.Object3D>;
  focus: Record<string, { target: THREE.Vector3; normal: THREE.Vector3 }>;
  update(t: number, dt: number, s: SceneState): void;
  dispose(): void;
}

const CAB_W = 0.8;
const CAB_H = 2.1;
const CAB_D = 0.6;
const PLINTH = 0.1;
const FRONT = CAB_D / 2;

const LAMP = {
  white: 0xfff0d2,
  green: 0x2fe07a,
  red: 0xff3b2c,
  amber: 0xffa516,
  blue: 0x3aa2ff,
};

export function buildScene(): Built {
  const disposables: { dispose(): void }[] = [];
  const keep = <X extends { dispose(): void }>(x: X) => (disposables.push(x), x);
  const updaters: ((t: number, dt: number, s: SceneState) => void)[] = [];
  const anchors: Record<string, THREE.Object3D> = {};
  const root = new THREE.Group();

  /* ---------------- materials ---------------- */
  const std = (p: THREE.MeshStandardMaterialParameters) => keep(new THREE.MeshStandardMaterial(p));
  const M = {
    paint: std({ color: 0xc9cec9, roughness: 0.5, metalness: 0.05 }),
    paintConsole: std({ color: 0x8a939b, roughness: 0.55, metalness: 0.08 }),
    plinth: std({ color: 0x0e1014, roughness: 0.8 }),
    black: std({ color: 0x17191d, roughness: 0.38, metalness: 0.1 }),
    blackMatte: std({ color: 0x1c1f24, roughness: 0.75 }),
    chrome: std({ color: 0xe6e9ee, roughness: 0.16, metalness: 1 }),
    steel: std({ color: 0x9aa1a8, roughness: 0.35, metalness: 0.85 }),
    white: std({ color: 0xebebe6, roughness: 0.45 }),
    lightGrey: std({ color: 0xb9bec4, roughness: 0.5 }),
    duct: std({ color: 0x9aa0a5, roughness: 0.7 }),
    plate: std({ color: 0xb9b8b0, roughness: 0.55, metalness: 0.3 }),
    module: std({ color: 0x2b3037, roughness: 0.5 }),
    relay: std({ color: 0xcac4b3, roughness: 0.5 }),
    terminal: std({ color: 0xffffff, roughness: 0.55 }),
    cable: std({ color: 0x0c0d10, roughness: 0.6 }),
    wall: std({ color: 0x17213d, roughness: 0.85, metalness: 0.1 }),
    yellow: std({ color: 0xf2c200, roughness: 0.5 }),
    red: std({ color: 0xd2231a, roughness: 0.32 }),
    green: std({ color: 0x1f9e4a, roughness: 0.35 }),
    wire: std({ color: 0xffffff, roughness: 0.5 }),
  };

  /* ---------------- shared geometry ---------------- */
  const geo = {
    lampLens: keep(new THREE.CylinderGeometry(0.0125, 0.0125, 0.014, 24).rotateX(Math.PI / 2).translate(0, 0, 0.011)),
    bezel: keep(new THREE.CylinderGeometry(0.019, 0.019, 0.008, 24).rotateX(Math.PI / 2).translate(0, 0, 0.004)),
    btn: keep(new THREE.CylinderGeometry(0.014, 0.014, 0.016, 24).rotateX(Math.PI / 2).translate(0, 0, 0.012)),
    knobBase: keep(new THREE.CylinderGeometry(0.022, 0.022, 0.01, 24).rotateX(Math.PI / 2).translate(0, 0, 0.005)),
    knob: keep(new RoundedBoxGeometry(0.012, 0.04, 0.022, 2, 0.004).translate(0, 0, 0.02)),
    handle: keep(new RoundedBoxGeometry(0.026, 0.15, 0.03, 2, 0.008).translate(0, 0, 0.015)),
    needle: keep(new THREE.BoxGeometry(0.0016, 1, 0.0008).translate(0, 0.5, 0)),
    cap: keep(new THREE.CylinderGeometry(0.004, 0.004, 0.004, 12).rotateX(Math.PI / 2)),
    box: keep(new THREE.BoxGeometry(1, 1, 1)),
  };

  const mesh = (g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0) => {
    const o = new THREE.Mesh(g, m);
    o.position.set(x, y, z);
    return o;
  };
  const box = (w: number, h: number, d: number, m: THREE.Material, x = 0, y = 0, z = 0) => {
    const o = new THREE.Mesh(geo.box, m);
    o.scale.set(w, h, d);
    o.position.set(x, y, z);
    return o;
  };

  /* ---------------- components ---------------- */
  const lampMats: Record<string, THREE.MeshStandardMaterial> = {};
  const lampMat = (color: number, key?: string) => {
    if (key && lampMats[key]) return lampMats[key];
    const m = std({ color, emissive: color, emissiveIntensity: 2.8, roughness: 0.25 });
    if (key) lampMats[key] = m;
    return m;
  };
  const lamp = (color: number, own = false) => {
    const g = new THREE.Group();
    const m = own ? lampMat(color) : lampMat(color, String(color));
    g.add(mesh(geo.bezel, M.chrome), mesh(geo.lampLens, m));
    return Object.assign(g, { lampMaterial: m });
  };
  const button = (m: THREE.Material) => {
    const g = new THREE.Group();
    g.add(mesh(geo.bezel, M.chrome), mesh(geo.btn, m));
    return g;
  };
  const selector = (angle = 0.6) => {
    const g = new THREE.Group();
    const k = mesh(geo.knob, M.black);
    k.rotation.z = angle;
    g.add(mesh(geo.knobBase, M.blackMatte), k);
    return g;
  };

  const faceCache = new Map<string, THREE.Texture>();
  const meter = (o: T.MeterOpts, value: () => number, size = 0.1) => {
    const g = new THREE.Group();
    const key = JSON.stringify(o);
    let tx = faceCache.get(key);
    if (!tx) {
      tx = keep(T.meterFace(o));
      faceCache.set(key, tx);
    }
    const bezelGeo = keep(new RoundedBoxGeometry(size, size, 0.03, 2, 0.004));
    const bz = mesh(bezelGeo, M.black, 0, 0, 0.012);
    const face = size * 0.86;
    const faceMat = std({ map: tx, roughness: 0.35 });
    const fp = mesh(keep(new THREE.PlaneGeometry(face, face)), faceMat, 0, 0, 0.0275);
    const pivot = new THREE.Group();
    pivot.position.set(0, face * (0.5 - T.METER_PIVOT), 0.0285);
    const n = mesh(geo.needle, M.black);
    n.scale.y = face * T.METER_RADIUS * 0.96;
    pivot.add(n, mesh(geo.cap, M.black));
    g.add(bz, fp, pivot);
    const min = o.min ?? 0;
    let current = value();
    updaters.push((_, dt) => {
      const target = value();
      current += (target - current) * Math.min(1, dt * 3);
      const f = THREE.MathUtils.clamp((current - min) / (o.max - min), 0, 1);
      pivot.rotation.z = T.METER_ARC - f * 2 * T.METER_ARC;
    });
    return g;
  };

  const plate = (text: string, sub: string | undefined, w = 0.4) => {
    const m = std({ map: keep(T.namePlate(text, sub)), roughness: 0.4 });
    return mesh(keep(new THREE.PlaneGeometry(w, w * (112 / 640))), m);
  };

  const acb = (w: number, h: number, rating: string) => {
    const g = new THREE.Group();
    const body = mesh(keep(new RoundedBoxGeometry(w, h, 0.36, 2, 0.008)), M.module, 0, 0, 0.07 - 0.18);
    const face = mesh(keep(new THREE.PlaneGeometry(w * 0.97, h * 0.97)), std({ map: keep(T.acbFascia(rating)), roughness: 0.5 }), 0, 0, 0.0705);
    const bx = (cx: number) => (cx / 368 - 0.5) * w * 0.97;
    const by = (cy: number) => (0.5 - cy / 320) * h * 0.97;
    const on = button(M.green);
    on.position.set(bx(62), by(160), 0.07);
    const off = button(M.red);
    off.position.set(bx(306), by(160), 0.07);
    const lever = mesh(keep(new RoundedBoxGeometry(w * 0.16, h * 0.34, 0.04, 2, 0.008)), M.black, 0, by(185), 0.085);
    // lifting lugs
    const lugGeo = keep(new RoundedBoxGeometry(0.03, 0.05, 0.05, 2, 0.006));
    g.add(body, face, on, off, lever, mesh(lugGeo, M.steel, -w * 0.42, h * 0.42, 0.08), mesh(lugGeo, M.steel, w * 0.42, h * 0.42, 0.08));
    return g;
  };

  const lcd = (W: number, H: number, w: number, lines: () => string[]) => {
    const [c, ctx] = T.canvas(W, H);
    const t = keep(T.tex(c));
    const m = std({ color: 0x000000, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 1.2, roughness: 0.3 });
    const o = mesh(keep(new THREE.PlaneGeometry(w, (w * H) / W)), m);
    let acc = 1;
    updaters.push((_, dt) => {
      acc += dt;
      if (acc < 0.5) return;
      acc = 0;
      T.drawLcd(ctx, W, H, lines());
      t.needsUpdate = true;
    });
    return o;
  };

  const screen = (W: number, H: number, w: number, draw: (ctx: CanvasRenderingContext2D, W: number, H: number, live: T.Live) => void, state: { live: T.Live }) => {
    const [c, ctx] = T.canvas(W, H);
    const t = keep(T.tex(c));
    const m = std({ color: 0x000000, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 1.05, roughness: 0.18 });
    const o = mesh(keep(new THREE.PlaneGeometry(w, (w * H) / W)), m);
    let acc = 1;
    updaters.push((_, dt) => {
      acc += dt;
      if (acc < 0.5) return;
      acc = 0;
      draw(ctx, W, H, state.live);
      t.needsUpdate = true;
    });
    return o;
  };

  // Shared live readings, written by the engine every frame
  const state = { live: { load: 0.62, dg1: 312, dg2: 298, hz: 60, volts: 440, t: 0 } as T.Live };
  updaters.push((_, __, s) => (state.live = s.live));

  /* ---------------- switchboard ---------------- */
  const DOORS: [number, number][] = [
    [0.04, 0.72],
    [0.74, 1.36],
    [1.38, 1.98],
  ];
  const yw = (yRel: number) => PLINTH + yRel; // world y from height above plinth

  const cabinetShell = (w = CAB_W, h = CAB_H, d = CAB_D) => {
    const g = new THREE.Group();
    g.add(box(w - 0.01, PLINTH, d - 0.04, M.plinth, 0, PLINTH / 2, -0.02));
    g.add(mesh(keep(new RoundedBoxGeometry(w - 0.006, h, d, 2, 0.006)), M.paint, 0, PLINTH + h / 2, 0));
    return g;
  };

  const frontPlane = (spec: T.PanelSpec, d = CAB_D) => {
    const m = std({ map: keep(T.panelFront(spec)), roughness: 0.5, metalness: 0.05 });
    return mesh(keep(new THREE.PlaneGeometry(spec.w - 0.008, spec.h - 0.008)), m, 0, PLINTH + spec.h / 2, d / 2 + 0.0012);
  };

  const at = (o: THREE.Object3D, x: number, yRel: number, z = FRONT + 0.0015) => {
    o.position.set(x, yw(yRel), z);
    return o;
  };

  const live = () => state.live;
  const jitter = (base: number, amp: number, f: number, ph = 0) => () => base + Math.sin(live().t * f + ph) * amp + Math.sin(live().t * f * 2.7 + ph) * amp * 0.4;

  const msb = new THREE.Group();
  root.add(msb);

  const genPanel = (x: number, n: 1 | 2) => {
    const g = cabinetShell();
    g.position.x = x;
    g.add(
      frontPlane({
        kind: 'gen',
        w: CAB_W,
        h: CAB_H,
        doors: DOORS,
        cutouts: [{ x: 0, y: 1.04, w: 0.47, h: 0.41 }],
        louvers: [{ x: 0, y: 0.22, cols: 2, rows: 7 }],
        labels: [
          { x: -0.28, y: 1.425, text: 'AVAIL', w: 0.085 },
          { x: -0.17, y: 1.425, text: 'ACB ON', w: 0.085 },
          { x: -0.06, y: 1.425, text: 'ACB OFF', w: 0.085 },
          { x: 0.05, y: 1.425, text: 'ALARM', w: 0.085 },
          { x: 0.18, y: 1.425, text: 'CLOSE', w: 0.085 },
          { x: 0.29, y: 1.425, text: 'OPEN', w: 0.085 },
          { x: 0.17, y: 1.585, text: 'AS', w: 0.06 },
          { x: 0.28, y: 1.585, text: 'VS', w: 0.06 },
          { x: 0, y: 0.79, text: `ACB · No.${n} GENERATOR`, w: 0.26 },
        ],
      }),
    );
    const p = plate(`No.${n} GENERATOR`, '440V 3Ø 60Hz');
    at(p, 0, 2.035);
    g.add(p);
    const load = n === 1 ? () => live().dg1 : () => live().dg2;
    g.add(at(meter({ unit: 'A', max: 1000, red: 850 }, () => load() * 1.55 + Math.sin(live().t * 1.3 + n) * 6, 0.11), -0.22, 1.8));
    g.add(at(meter({ unit: 'V', max: 600, red: 500 }, () => live().volts, 0.11), 0, 1.8));
    g.add(at(meter({ unit: 'kW', max: 600, red: 500 }, load, 0.11), 0.22, 1.8));
    g.add(at(meter({ unit: 'Hz', min: 55, max: 65, decimals: 0 }, () => live().hz, 0.11), -0.22, 1.635));
    g.add(at(meter({ unit: 'cos φ', min: 0.5, max: 1, decimals: 1 }, jitter(0.86, 0.01, 0.4, n), 0.11), 0, 1.635));
    g.add(at(selector(0.5), 0.17, 1.635), at(selector(-0.4), 0.28, 1.635));
    const lamps = [LAMP.white, LAMP.red, LAMP.green, LAMP.amber];
    lamps.forEach((c, i) => {
      const l = lamp(c, i === 3);
      at(l, -0.28 + i * 0.11, 1.47);
      g.add(l);
      if (i === 3 && n === 2) {
        // DG2 alarm lamp blinks
        updaters.push((t, _dt, s) => {
          l.lampMaterial.emissiveIntensity = s.reduced ? 2 : Math.floor(t * 1.6) % 2 ? 3.4 : 0.15;
        });
      } else if (i === 3) {
        l.lampMaterial.emissiveIntensity = 0.12;
      }
    });
    g.add(at(button(M.green), 0.18, 1.47), at(button(M.red), 0.29, 1.47));
    const breaker = acb(0.46, 0.4, n === 1 ? 'ACB 1600A' : 'ACB 1600A');
    at(breaker, 0, 1.04, FRONT);
    g.add(breaker);
    g.add(at(mesh(geo.handle, M.chrome), 0.345, 1.05));
    g.add(at(mesh(geo.handle, M.chrome), 0.345, 0.42));
    return { g, breaker };
  };

  const syncPanel = (x: number) => {
    const g = cabinetShell();
    g.position.x = x;
    g.add(
      frontPlane({
        kind: 'sync',
        w: CAB_W,
        h: CAB_H,
        doors: DOORS,
        cutouts: [{ x: 0, y: 0.9, w: 0.24, h: 0.12 }],
        louvers: [{ x: 0, y: 0.22, cols: 2, rows: 7 }],
        warning: { x: -0.2, y: 0.55 },
        labels: [
          { x: -0.06, y: 1.53, text: 'SYNC', w: 0.07 },
          { x: -0.2, y: 1.435, text: 'GEN SEL', w: 0.09 },
          { x: -0.07, y: 1.435, text: 'GOV', w: 0.07 },
          { x: 0.07, y: 1.435, text: 'MODE', w: 0.07 },
          { x: 0.2, y: 1.435, text: 'PMS', w: 0.07 },
          { x: -0.2, y: 1.13, text: 'DG1 START', w: 0.1 },
          { x: -0.07, y: 1.13, text: 'DG1 STOP', w: 0.1 },
          { x: 0.07, y: 1.13, text: 'DG2 START', w: 0.1 },
          { x: 0.2, y: 1.13, text: 'DG2 STOP', w: 0.1 },
          { x: 0, y: 0.81, text: 'POWER MANAGEMENT', w: 0.24 },
        ],
      }),
    );
    const p = plate('SYNCHRONIZING', 'BUS TIE · PMS');
    at(p, 0, 2.035);
    g.add(p);
    // synchroscope
    const sg = new THREE.Group();
    const bez = mesh(keep(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 48).rotateX(Math.PI / 2)), M.black, 0, 0, 0.015);
    const facePlane = mesh(keep(new THREE.CircleGeometry(0.088, 48)), std({ map: keep(T.synchroscopeFace()), roughness: 0.35 }), 0, 0, 0.0305);
    // map circle uv to the square texture
    const pointer = new THREE.Group();
    pointer.position.z = 0.032;
    const pn = mesh(geo.needle, M.black);
    pn.scale.set(2.2, 0.075, 1);
    pointer.add(pn, mesh(geo.cap, M.black));
    sg.add(bez, facePlane, pointer);
    at(sg, 0, 1.76);
    g.add(sg);
    anchors.synchro = sg;
    updaters.push((_, dt, s) => {
      pointer.rotation.z -= s.reduced ? 0 : dt * 0.9;
    });
    g.add(at(meter({ unit: 'Hz', min: 55, max: 65 }, () => live().hz + 0.15, 0.1), -0.26, 1.85));
    g.add(at(meter({ unit: 'Hz', min: 55, max: 65 }, () => live().hz, 0.1), 0.26, 1.85));
    g.add(at(meter({ unit: 'V', max: 600, red: 500 }, () => live().volts + 3, 0.1), -0.26, 1.69));
    g.add(at(meter({ unit: 'V', max: 600, red: 500 }, () => live().volts, 0.1), 0.26, 1.69));
    // sync lamps, dark-lamp method
    [-0.06, 0, 0.06].forEach((lx, i) => {
      const l = lamp(LAMP.white, true);
      at(l, lx, 1.575);
      g.add(l);
      updaters.push((t, _dt, s) => {
        l.lampMaterial.emissiveIntensity = s.reduced ? 1.5 : 0.2 + 2.8 * (0.5 + 0.5 * Math.sin(t * 2.4 + (i * Math.PI * 2) / 3));
      });
    });
    [-0.2, -0.07, 0.07, 0.2].forEach((sx, i) => g.add(at(selector([0.6, 0, -0.6, 0.6][i]), sx, 1.475)));
    [-0.2, -0.07, 0.07, 0.2].forEach((bx, i) => g.add(at(button(i % 2 ? M.red : M.green), bx, 1.18)));
    [-0.2, -0.07, 0.07, 0.2].forEach((bx) => g.add(at(button(M.black), bx, 1.05)));
    const pms = lcd(256, 128, 0.22, () => {
      const l = live();
      return [`PMS AUTO  ${l.hz.toFixed(1)}Hz`, `DG1 ${Math.round(l.dg1)}kW  DG2 ${Math.round(l.dg2)}kW`, `BUS ${Math.round(l.volts)}V  LOAD ${Math.round(l.load * 100)}%`];
    });
    at(pms, 0, 0.9, FRONT + 0.002);
    g.add(pms);
    g.add(at(mesh(geo.handle, M.chrome), 0.345, 1.05), at(mesh(geo.handle, M.chrome), 0.345, 0.42));
    return g;
  };

  const FEEDERS = {
    a: ['No.1 STEERING GEAR', 'FIRE & GS PUMP', 'MAIN CW PUMP 1', 'MAIN CW PUMP 2', 'E/R VENT FAN 1', 'E/R VENT FAN 2', 'FO PURIFIER', 'LO PURIFIER', 'AIR COMPR. 1', 'AIR COMPR. 2', 'BALLAST PUMP', 'BILGE PUMP'],
    b: ['No.2 STEERING GEAR', 'E/R CRANE', 'GALLEY', 'ACCOM. AHU', 'LIGHTING TRANSF.', 'NAV. EQUIPMENT', 'WINDLASS', 'MOORING WINCH', 'REEFER SOCKETS', 'WORKSHOP', 'SPARE', 'SPARE'],
  };
  const MCCB_X = [-0.22, 0, 0.22];
  const MCCB_Y = [1.22, 0.96, 0.56, 0.3];
  const mccbBody = keep(new RoundedBoxGeometry(0.11, 0.15, 0.06, 2, 0.006));
  const mccbHandle = keep(new RoundedBoxGeometry(0.022, 0.034, 0.024, 2, 0.004));

  const feederPanel = (x: number, which: 'a' | 'b') => {
    const g = cabinetShell();
    g.position.x = x;
    const labels = FEEDERS[which].map((text, i) => ({ x: MCCB_X[i % 3], y: MCCB_Y[Math.floor(i / 3)] - 0.098, text, w: 0.17 }));
    g.add(
      frontPlane({
        kind: 'feeder',
        w: CAB_W,
        h: CAB_H,
        doors: DOORS,
        cutouts: MCCB_Y.flatMap((y) => MCCB_X.map((cx) => ({ x: cx, y, w: 0.115, h: 0.155 }))),
        labels: [
          ...labels,
          { x: -0.2, y: 1.535, text: 'EARTH FAULT', w: 0.12 },
          { x: 0, y: 1.535, text: 'BUS LIVE', w: 0.1 },
          { x: 0.2, y: 1.535, text: 'AS', w: 0.06 },
        ],
      }),
    );
    const p = plate(which === 'a' ? '440V FEEDER  1' : '440V FEEDER  2', 'POWER DISTRIBUTION');
    at(p, 0, 2.035);
    g.add(p);
    g.add(at(meter({ unit: 'A', max: 2000, red: 1700 }, () => 900 + live().load * 700, 0.11), -0.2, 1.8));
    g.add(at(meter({ unit: 'V', max: 600, red: 500 }, () => live().volts, 0.11), 0, 1.8));
    g.add(at(meter({ unit: 'MΩ', max: 10, sub: 'INSULATION' }, jitter(7.6, 0.08, 0.2, which === 'a' ? 0 : 2), 0.11), 0.2, 1.8));
    g.add(at(lamp(LAMP.white), -0.2, 1.58), at(lamp(LAMP.green), 0, 1.58), at(selector(0.3), 0.2, 1.58));
    MCCB_Y.forEach((y, r) =>
      MCCB_X.forEach((cx, c) => {
        const idx = r * 3 + c;
        const spare = FEEDERS[which][idx] === 'SPARE';
        const b = new THREE.Group();
        b.add(mesh(mccbBody, M.blackMatte, 0, 0, 0.012));
        const h = mesh(mccbHandle, spare ? M.lightGrey : M.white, 0, spare ? -0.018 : 0.018, 0.05);
        b.add(h);
        at(b, cx, y);
        g.add(b);
      }),
    );
    return g;
  };

  const shorePanel = (x: number) => {
    const g = cabinetShell();
    g.position.x = x;
    g.add(
      frontPlane({
        kind: 'shore',
        w: CAB_W,
        h: CAB_H,
        doors: DOORS,
        cutouts: [{ x: 0, y: 1.04, w: 0.42, h: 0.37 }],
        louvers: [{ x: 0, y: 0.22, cols: 2, rows: 7 }],
        labels: [
          { x: -0.2, y: 1.535, text: 'SHORE AVAIL', w: 0.12 },
          { x: 0, y: 1.535, text: 'PHASE SEQ', w: 0.11 },
          { x: 0.2, y: 1.535, text: 'ACB ON', w: 0.09 },
          { x: 0, y: 0.81, text: 'ACB · SHORE CONNECTION', w: 0.26 },
        ],
      }),
    );
    const p = plate('SHORE CONNECTION', '440V 3Ø 60Hz');
    at(p, 0, 2.035);
    g.add(p);
    g.add(at(meter({ unit: 'V', max: 600, red: 500 }, () => 0, 0.11), -0.2, 1.8));
    g.add(at(meter({ unit: 'A', max: 1000, red: 850 }, () => 0, 0.11), 0, 1.8));
    const kwh = lcd(256, 96, 0.12, () => ['kWh', '004182.6']);
    at(kwh, 0.2, 1.8, FRONT + 0.002);
    g.add(kwh);
    // ship is on its own generators: shore-available lamp stays dark
    const avail = lamp(LAMP.white, true);
    avail.lampMaterial.emissiveIntensity = 0.12;
    g.add(at(avail, -0.2, 1.58), at(lamp(LAMP.green), 0, 1.58), at(lamp(LAMP.green), 0.2, 1.58));
    const breaker = acb(0.4, 0.36, 'ACB 1000A');
    at(breaker, 0, 1.04, FRONT);
    g.add(breaker);
    g.add(at(mesh(geo.handle, M.chrome), 0.345, 1.05), at(mesh(geo.handle, M.chrome), 0.345, 0.42));
    return g;
  };

  const xs = [-2.0, -1.2, -0.4, 0.4, 1.2, 2.0];
  const dg1 = genPanel(xs[0], 1);
  const dg2 = genPanel(xs[1], 2);
  msb.add(dg1.g, dg2.g, syncPanel(xs[2]), feederPanel(xs[3], 'a'), feederPanel(xs[4], 'b'), shorePanel(xs[5]));
  anchors.acb1 = dg1.breaker;
  anchors.acb2 = dg2.breaker;
  const dg2RestZ = dg2.breaker.position.z;

  // Mimic bus — single-line diagram on the doors, with energy pulses
  const mimicMat = keep(
    new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0x2bbbe5) },
      },
      vertexShader: /* glsl */ `
        varying vec3 vW;
        void main() {
          vec4 w = modelMatrix * vec4(position, 1.0);
          vW = w.xyz;
          gl_Position = projectionMatrix * viewMatrix * w;
        }`,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec3 uColor;
        varying vec3 vW;
        void main() {
          float s = (vW.x + 2.4) * 0.9 + max(0.0, 1.51 - vW.y) * 2.2;
          float p = fract(s * 0.55 - uTime * 0.32);
          float pulse = pow(p, 22.0) * 9.0;
          gl_FragColor = vec4(uColor * (1.25 + pulse), 1.0);
        }`,
    }),
  );
  const MIMIC_Y = 1.41;
  const strip = (x0: number, x1: number, y0: number, y1: number, t = 0.012) => {
    const w = Math.max(Math.abs(x1 - x0), t);
    const h = Math.max(Math.abs(y1 - y0), t);
    return mesh(keep(new THREE.PlaneGeometry(w, h)), mimicMat, (x0 + x1) / 2, yw((y0 + y1) / 2), FRONT + 0.0035);
  };
  msb.add(strip(-2.37, 2.37, MIMIC_Y, MIMIC_Y, 0.014));
  const busTie = mesh(keep(new THREE.PlaneGeometry(0.05, 0.05)), mimicMat, xs[2], yw(MIMIC_Y), FRONT + 0.0036);
  msb.add(busTie);
  [xs[0], xs[1]].forEach((x) => msb.add(strip(x, x, MIMIC_Y, 1.245)));
  msb.add(strip(xs[5], xs[5], MIMIC_Y, 1.225));
  [xs[3], xs[4]].forEach((x) => MCCB_X.forEach((dx) => msb.add(strip(x + dx, x + dx, MIMIC_Y, 1.3))));
  const mimicAnchor = new THREE.Object3D();
  mimicAnchor.position.set(-0.78, yw(MIMIC_Y), FRONT);
  msb.add(mimicAnchor);
  anchors.mimic = mimicAnchor;
  updaters.push((t, _dt, s) => (mimicMat.uniforms.uTime.value = s.reduced ? 0.4 : t));

  // DG2 breaker withdrawal (chapter 4)
  updaters.push((_t, _dt, s) => {
    const e = s.rackOut * s.rackOut * (3 - 2 * s.rackOut);
    dg2.breaker.position.z = dg2RestZ + e * 0.34;
  });

  // Cable tray and drops above the board
  const tray = new THREE.Group();
  tray.add(box(5.2, 0.07, 0.012, M.steel, 0, 2.66, -0.16), box(5.2, 0.07, 0.012, M.steel, 0, 2.66, 0.24));
  for (let x = -2.5; x <= 2.5; x += 0.3) tray.add(box(0.025, 0.012, 0.4, M.steel, x, 2.63, 0.04));
  [-0.1, -0.04, 0.02, 0.08, 0.14].forEach((z, i) => {
    const r = 0.016 + (i % 3) * 0.004;
    const along = keep(new THREE.CylinderGeometry(r, r, 5.2, 10).rotateZ(Math.PI / 2));
    tray.add(mesh(along, M.cable, 0, 2.645 + r, z));
  });
  const drop = keep(new THREE.CylinderGeometry(0.018, 0.018, 0.46, 10));
  xs.forEach((x) => {
    tray.add(mesh(drop, M.cable, x - 0.15, 2.43, 0.0), mesh(drop, M.cable, x + 0.12, 2.43, 0.06));
  });
  root.add(tray);

  /* ---------------- ECR console ---------------- */
  const consoleG = new THREE.Group();
  consoleG.position.set(-4.25, 0, 1.35);
  consoleG.rotation.y = 0.62;
  root.add(consoleG);
  {
    const shape = new THREE.Shape();
    const prof: [number, number][] = [
      [0.35, 0.06],
      [0.35, 0.8],
      [-0.095, 0.98],
      [-0.35, 0.98],
      [-0.35, 1.46],
      [-0.56, 1.46],
      [-0.56, 0.06],
    ];
    shape.moveTo(prof[0][0], prof[0][1]);
    prof.slice(1).forEach(([a, b]) => shape.lineTo(a, b));
    shape.closePath();
    const body = keep(new THREE.ExtrudeGeometry(shape, { depth: 1.9, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 2 }));
    body.rotateY(-Math.PI / 2).translate(0.95, 0, 0);
    consoleG.add(mesh(body, M.paintConsole));
    consoleG.add(box(1.86, 0.06, 0.86, M.plinth, 0, 0.03, -0.1));

    const slopeAngle = Math.atan2(0.18, 0.445);
    const slope = mesh(keep(new THREE.PlaneGeometry(1.86, 0.46)), std({ map: keep(T.consoleSlope()), roughness: 0.55 }));
    slope.position.set(0, (0.8 + 0.98) / 2 + 0.008, (0.35 - 0.095) / 2 + 0.003);
    slope.rotation.x = -(Math.PI / 2 - slopeAngle);
    consoleG.add(slope);

    // buttons and lamps on the slope, instanced
    const u = new THREE.Vector3(1, 0, 0);
    const v = new THREE.Vector3(0, Math.sin(slopeAngle), -Math.cos(slopeAngle));
    const nrm = new THREE.Vector3(0, Math.cos(slopeAngle), Math.sin(slopeAngle));
    const centre = slope.position.clone();
    const btnGeo = keep(new THREE.CylinderGeometry(0.013, 0.013, 0.014, 16));
    const groups = [-0.67, -0.257, 0.233, 0.646];
    const count = groups.length * 10;
    const inst = new THREE.InstancedMesh(btnGeo, M.white, count);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), nrm);
    const mtx = new THREE.Matrix4();
    const col = new THREE.Color();
    let k = 0;
    const palette = [0x1f9e4a, 0xd2231a, 0x1c1f24, 0x1c1f24, 0xe8e8e2];
    groups.forEach((gx) => {
      for (let i = 0; i < 10; i++) {
        const cx = gx + ((i % 5) - 2) * 0.042;
        const cy = -0.11 + Math.floor(i / 5) * -0.06;
        const p = centre.clone().addScaledVector(u, cx).addScaledVector(v, cy).addScaledVector(nrm, 0.007);
        mtx.compose(p, q, new THREE.Vector3(1, 1, 1));
        inst.setMatrixAt(k, mtx);
        inst.setColorAt(k, col.setHex(palette[(i + Math.round(gx * 10)) % palette.length]));
        k++;
      }
    });
    consoleG.add(inst);
    const btnAnchor = new THREE.Object3D();
    btnAnchor.position.copy(centre.clone().addScaledVector(u, -0.257).addScaledVector(v, -0.14));
    consoleG.add(btnAnchor);
    anchors.consoleButtons = btnAnchor;

    // monitors on the upper housing
    const housingZ = -0.35;
    const bezGeo = keep(new RoundedBoxGeometry(0.6, 0.38, 0.03, 2, 0.008));
    const s1 = screen(512, 320, 0.54, T.drawAlarmScreen, state);
    const s2 = screen(512, 320, 0.54, T.drawPowerScreen, state);
    [
      [-0.46, s1],
      [0.46, s2],
    ].forEach(([x, s]) => {
      const bx = x as number;
      consoleG.add(mesh(bezGeo, M.black, bx, 1.22, housingZ + 0.015));
      (s as THREE.Mesh).position.set(bx, 1.22, housingZ + 0.031);
      consoleG.add(s as THREE.Mesh);
    });
    anchors.consoleScreen = s1;
    // telephone handset block, keyboard
    consoleG.add(box(0.42, 0.018, 0.14, M.black, -0.05, 0.99, -0.22));
  }

  /* ---------------- automation cabinets ---------------- */
  const auto = new THREE.Group();
  auto.position.set(3.6, 0, 1.0);
  auto.rotation.y = -0.55;
  root.add(auto);
  const AH = 2.0;
  const AD = 0.5;
  {
    // Cabinet A — closed, HMI on the door
    const a = cabinetShell(CAB_W, AH, AD);
    a.position.x = -0.42;
    a.add(
      frontPlane(
        {
          kind: 'auto',
          w: CAB_W,
          h: AH,
          doors: [[0.04, 1.96]],
          cutouts: [{ x: 0, y: 1.42, w: 0.33, h: 0.25 }],
          louvers: [{ x: 0, y: 0.2, cols: 2, rows: 6 }],
          labels: [
            { x: -0.18, y: 1.135, text: 'POWER', w: 0.08 },
            { x: -0.06, y: 1.135, text: 'RUN', w: 0.08 },
            { x: 0.06, y: 1.135, text: 'ALARM', w: 0.08 },
            { x: 0.18, y: 1.135, text: 'FAULT', w: 0.08 },
            { x: 0, y: 0.89, text: 'EMERGENCY STOP', w: 0.15 },
            { x: 0.2, y: 0.93, text: 'LOCAL / REMOTE', w: 0.13 },
          ],
        },
        AD,
      ),
    );
    const p = plate('AUTOMATION  A1', 'BILGE · BALLAST · PLC');
    p.position.set(0, yw(1.78), AD / 2 + 0.0015);
    a.add(p);
    const hmi = screen(512, 384, 0.3, T.drawHmiScreen, state);
    a.add(mesh(keep(new RoundedBoxGeometry(0.33, 0.25, 0.026, 2, 0.008)), M.black, 0, yw(1.42), AD / 2 + 0.012));
    hmi.position.set(0, yw(1.42), AD / 2 + 0.0255);
    a.add(hmi);
    anchors.hmi = hmi;
    [LAMP.white, LAMP.green, LAMP.amber, LAMP.red].forEach((c, i) => {
      const l = lamp(c, true);
      l.position.set(-0.18 + i * 0.12, yw(1.18), AD / 2 + 0.0015);
      if (i === 3) l.lampMaterial.emissiveIntensity = 0.12;
      if (i === 2) updaters.push((t, _dt, s) => (l.lampMaterial.emissiveIntensity = s.reduced ? 2 : Math.floor(t * 1.2) % 2 ? 3 : 0.15));
      a.add(l);
    });
    const es = new THREE.Group();
    es.add(mesh(keep(new THREE.CylinderGeometry(0.052, 0.052, 0.004, 40).rotateX(Math.PI / 2)), M.yellow, 0, 0, 0.002));
    es.add(mesh(keep(new THREE.CylinderGeometry(0.02, 0.024, 0.03, 32).rotateX(Math.PI / 2)), M.red, 0, 0, 0.018));
    es.add(mesh(keep(new THREE.CylinderGeometry(0.034, 0.034, 0.018, 32).rotateX(Math.PI / 2)), M.red, 0, 0, 0.04));
    es.position.set(0, yw(0.98), AD / 2 + 0.0015);
    a.add(es);
    const ks = selector(-0.7);
    ks.position.set(0.2, yw(0.98), AD / 2 + 0.0015);
    a.add(ks);
    a.add(mesh(geo.handle, M.chrome, 0.345, yw(1.0), AD / 2 + 0.0015));
    auto.add(a);

    // Cabinet B — door open on the PLC rack
    const b = new THREE.Group();
    b.position.x = 0.42;
    auto.add(b);
    b.add(box(CAB_W - 0.01, PLINTH, AD - 0.04, M.plinth, 0, PLINTH / 2, -0.02));
    const wall = 0.018;
    b.add(box(CAB_W, AH, wall, M.paint, 0, yw(AH / 2), -AD / 2 + wall / 2));
    b.add(box(wall, AH, AD, M.paint, -CAB_W / 2 + wall / 2, yw(AH / 2), 0));
    b.add(box(wall, AH, AD, M.paint, CAB_W / 2 - wall / 2, yw(AH / 2), 0));
    b.add(box(CAB_W, wall, AD, M.paint, 0, yw(AH - wall / 2), 0));
    b.add(box(CAB_W, wall, AD, M.paint, 0, yw(wall / 2), 0));
    // front frame lip
    b.add(box(CAB_W, 0.035, 0.02, M.paint, 0, yw(AH - 0.0175), AD / 2 - 0.01));
    b.add(box(CAB_W, 0.035, 0.02, M.paint, 0, yw(0.0175), AD / 2 - 0.01));
    const zp = -AD / 2 + wall + 0.004;
    b.add(box(0.72, 1.86, 0.006, M.plate, 0, yw(1.0), zp));
    const front = zp + 0.003;

    // wire ducts
    [1.86, 1.56, 1.26, 0.98, 0.7].forEach((y) => b.add(box(0.6, 0.05, 0.07, M.duct, 0, yw(y), front + 0.035)));
    [-0.33, 0.33].forEach((x) => b.add(box(0.05, 1.21, 0.07, M.duct, x, yw(1.28), front + 0.035)));
    // DIN rails
    [1.71, 1.41, 1.12, 0.84].forEach((y) => b.add(box(0.58, 0.035, 0.008, M.chrome, 0, yw(y), front + 0.004)));

    // MCBs + PSU
    const mcb = new THREE.InstancedMesh(geo.box, M.white, 10);
    const mcbT = new THREE.InstancedMesh(geo.box, M.black, 10);
    for (let i = 0; i < 10; i++) {
      const x = -0.26 + i * 0.0185;
      mcb.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(x, yw(1.71), front + 0.042), new THREE.Quaternion(), new THREE.Vector3(0.0175, 0.085, 0.068)));
      mcbT.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(x, yw(1.715), front + 0.079), new THREE.Quaternion(), new THREE.Vector3(0.008, 0.016, 0.01)));
    }
    b.add(mcb, mcbT);
    b.add(box(0.11, 0.12, 0.11, M.lightGrey, 0.17, yw(1.71), front + 0.055));

    // PLC rack
    const plc = new THREE.Group();
    plc.add(box(0.07, 0.125, 0.1, M.module, -0.22, yw(1.41), front + 0.05));
    const modules: THREE.Mesh[] = [];
    for (let i = 0; i < 8; i++) {
      const m = box(0.034, 0.125, 0.095, M.module, -0.165 + i * 0.036, yw(1.41), front + 0.0475);
      modules.push(m);
      plc.add(m);
    }
    b.add(plc);
    anchors.plc = plc.children[0];
    // PLC LEDs
    const ledCount = 8 * 16 + 6;
    const ledMat = keep(new THREE.MeshBasicMaterial({ color: 0xffffff }));
    const leds = new THREE.InstancedMesh(keep(new THREE.BoxGeometry(0.0045, 0.0035, 0.002)), ledMat, ledCount);
    const ledOn: boolean[] = [];
    const ledCol: number[] = [];
    let li = 0;
    for (let mI = 0; mI < 8; mI++) {
      for (let r = 0; r < 8; r++) {
        for (let cI = 0; cI < 2; cI++) {
          const x = -0.165 + mI * 0.036 + (cI ? 0.006 : -0.006);
          const y = yw(1.41) + 0.045 - r * 0.0075;
          leds.setMatrixAt(li, new THREE.Matrix4().makeTranslation(x, y, front + 0.096));
          ledCol.push(mI === 5 && r === 2 ? 0xff3b2c : mI < 4 ? 0x2fe07a : 0xffa516);
          ledOn.push(Math.random() > 0.45);
          li++;
        }
      }
    }
    for (let r = 0; r < 6; r++) {
      leds.setMatrixAt(li, new THREE.Matrix4().makeTranslation(-0.24, yw(1.41) + 0.045 - r * 0.009, front + 0.101));
      ledCol.push(r < 2 ? 0x2fe07a : r === 2 ? 0xffa516 : 0x2fe07a);
      ledOn.push(r !== 4);
      li++;
    }
    const lc = new THREE.Color();
    const paintLeds = () => {
      for (let i = 0; i < ledCount; i++) {
        lc.setHex(ledCol[i]);
        if (ledOn[i]) lc.multiplyScalar(4.2);
        else lc.multiplyScalar(0.06);
        leds.setColorAt(i, lc);
      }
      leds.instanceColor!.needsUpdate = true;
    };
    paintLeds();
    b.add(leds);
    let ledAcc = 0;
    updaters.push((_t, dt, s) => {
      if (s.reduced) return;
      ledAcc += dt;
      if (ledAcc < 0.11) return;
      ledAcc = 0;
      for (let i = 0; i < 10; i++) {
        const j = Math.floor(Math.random() * 8 * 16);
        ledOn[j] = !ledOn[j];
      }
      paintLeds();
    });
    // one I/O module slides out in chapter 4
    const pulled = modules[5];
    const pulledZ = pulled.position.z;
    updaters.push((_t, _dt, s) => {
      const e = s.rackOut * s.rackOut * (3 - 2 * s.rackOut);
      pulled.position.z = pulledZ + e * 0.09;
    });

    // relays, contactors
    const relays = new THREE.InstancedMesh(geo.box, M.relay, 14);
    for (let i = 0; i < 14; i++) {
      relays.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(-0.27 + i * 0.0172, yw(1.12), front + 0.037), new THREE.Quaternion(), new THREE.Vector3(0.0158, 0.075, 0.07)));
    }
    b.add(relays);
    for (let i = 0; i < 4; i++) b.add(box(0.045, 0.088, 0.09, M.white, 0.04 + i * 0.052, yw(1.12), front + 0.047));

    // terminal blocks
    const tn = 78;
    const terms = new THREE.InstancedMesh(geo.box, M.terminal, tn);
    const tcol = new THREE.Color();
    for (let i = 0; i < tn; i++) {
      terms.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(-0.27 + i * 0.0071, yw(0.84), front + 0.026), new THREE.Quaternion(), new THREE.Vector3(0.0062, 0.066, 0.048)));
      terms.setColorAt(i, tcol.setHex(i > tn - 7 ? 0x4c9a3c : i % 9 === 4 ? 0x2a62c9 : 0x8d949a));
    }
    b.add(terms);
    anchors.terminals = new THREE.Object3D();
    anchors.terminals.position.set(-0.1, yw(0.84), front + 0.05);
    b.add(anchors.terminals);

    // short wire runs between ducts and devices
    const wireGeo = keep(new THREE.CylinderGeometry(0.0013, 0.0013, 1, 6));
    const runs: [number, number, number][] = [];
    for (let i = 0; i < 14; i++) runs.push([-0.27 + i * 0.0172, 1.235, 1.16], [-0.27 + i * 0.0172, 1.08, 1.0]);
    for (let i = 0; i < tn; i += 2) runs.push([-0.27 + i * 0.0071, 0.955, 0.875]);
    for (let i = 0; i < 8; i++) runs.push([-0.165 + i * 0.036, 1.535, 1.475], [-0.165 + i * 0.036, 1.345, 1.285]);
    for (let i = 0; i < 10; i++) runs.push([-0.26 + i * 0.0185, 1.835, 1.755]);
    const wires = new THREE.InstancedMesh(wireGeo, M.wire, runs.length);
    const wc = new THREE.Color();
    runs.forEach(([x, y0, y1], i) => {
      const len = Math.abs(y0 - y1);
      wires.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(x, yw((y0 + y1) / 2), front + 0.03), new THREE.Quaternion(), new THREE.Vector3(1, len, 1)));
      wires.setColorAt(i, wc.setHex(i % 11 === 0 ? 0xc22a20 : i % 5 === 0 ? 0x18191c : 0x1d4fd0));
    });
    b.add(wires);

    // incoming cables through the bottom
    [-0.18, -0.08, 0.04, 0.16].forEach((x, i) => {
      const r = 0.012 + (i % 2) * 0.006;
      b.add(mesh(keep(new THREE.CylinderGeometry(r, r, 0.62, 10)), M.cable, x, yw(0.33), front + 0.05 + (i % 2) * 0.03));
    });

    // cabinet light
    const strip = std({ color: 0xffffff, emissive: 0xfff6e8, emissiveIntensity: 1.6 });
    b.add(box(0.42, 0.008, 0.02, strip, 0, yw(AH - 0.03), 0.1));
    const inner = new THREE.PointLight(0xfff1dc, 0.45, 1.6, 2);
    inner.position.set(0, yw(1.75), 0.12);
    b.add(inner);

    // open door, hinged on the right
    const hinge = new THREE.Group();
    hinge.position.set(CAB_W / 2, 0, AD / 2);
    hinge.rotation.y = 1.95;
    const door = mesh(keep(new RoundedBoxGeometry(CAB_W - 0.006, AH - 0.04, 0.022, 2, 0.006)), M.paint, -CAB_W / 2, yw(AH / 2), 0.011);
    hinge.add(door);
    hinge.add(box(0.32, 0.36, 0.03, M.lightGrey, -CAB_W / 2, yw(1.2), -0.016));
    hinge.add(mesh(geo.handle, M.chrome, -CAB_W + 0.055, yw(1.0), 0.022));
    const pl = plate('AUTOMATION  A2', 'PLC · I/O', 0.36);
    pl.position.set(-CAB_W / 2, yw(1.78), 0.0225);
    hinge.add(pl);
    b.add(hinge);
  }

  /* ---------------- room ---------------- */
  const deck = T.deckPlate();
  deck.repeat.set(48, 48);
  keep(deck);
  const floor = mesh(keep(new THREE.PlaneGeometry(30, 30)), std({ map: deck, roughness: 0.62, metalness: 0.35 }), 0, 0, 0);
  floor.rotation.x = -Math.PI / 2;
  root.add(floor);
  const matTex = T.rubberMat();
  matTex.repeat.set(1, 40);
  keep(matTex);
  root.add(box(4.9, 0.008, 1.1, std({ map: matTex, roughness: 0.95 }), 0, 0.004, FRONT + 0.6));

  const wallZ = -CAB_D / 2 - 0.04;
  root.add(mesh(keep(new THREE.PlaneGeometry(26, 6)), M.wall, 0, 3, wallZ));
  for (let x = -9.1; x <= 9.1; x += 1.4) root.add(box(0.09, 6, 0.14, M.wall, x, 3, wallZ + 0.07));
  root.add(box(26, 0.32, 0.5, M.wall, 0, 3.15, wallZ + 0.25));

  /* ---------------- focus points for the camera ---------------- */
  const wp = (o: THREE.Object3D, local = new THREE.Vector3()) => {
    o.updateWorldMatrix(true, false);
    return local.applyMatrix4(o.matrixWorld);
  };
  root.updateMatrixWorld(true);
  const consoleNormal = new THREE.Vector3(Math.sin(0.62), 0, Math.cos(0.62));
  const autoNormal = new THREE.Vector3(Math.sin(-0.55), 0, Math.cos(-0.55));
  const focus = {
    console: { target: wp(consoleG, new THREE.Vector3(0, 1.05, -0.05)), normal: consoleNormal },
    automation: { target: wp(auto, new THREE.Vector3(0.42, 1.4, 0)), normal: autoNormal },
    autoPair: { target: wp(auto, new THREE.Vector3(0.05, 1.3, 0)), normal: autoNormal },
  };

  return {
    root,
    anchors,
    focus,
    update(t, dt, s) {
      for (const u of updaters) u(t, dt, s);
    },
    dispose() {
      disposables.forEach((d) => d.dispose());
    },
  };
}
