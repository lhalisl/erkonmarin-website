import * as THREE from 'three';

// Canvas painters for the switchboard scene. Everything is drawn at runtime
// so the scene ships without image assets.

export const MONO = '"IBM Plex Mono", ui-monospace, Menlo, monospace';
export const SANS = '"Montserrat", "Helvetica Neue", Arial, sans-serif';

/** Pixels per metre on panel fronts. */
export const PX = 800;

export function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!];
}

export function tex(c: HTMLCanvasElement, srgb = true, aniso = 8) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = aniso;
  return t;
}

function grain(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * amount;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/* ------------------------------------------------------------------ */
/* Panel fronts                                                        */
/* ------------------------------------------------------------------ */

export type PanelKind = 'gen' | 'sync' | 'feeder' | 'shore' | 'auto';

export interface Cutout {
  x: number; // local metres, centre
  y: number; // metres above body bottom, centre
  w: number;
  h: number;
}

export interface PanelSpec {
  kind: PanelKind;
  w: number;
  h: number;
  doors: [number, number][]; // [yBottom, yTop] in metres
  cutouts?: Cutout[];
  labels?: { x: number; y: number; text: string; w?: number }[];
  louvers?: { x: number; y: number; cols: number; rows: number }[];
  warning?: { x: number; y: number };
}

const PAINT_TOP = '#d4d8d4';
const PAINT_BOTTOM = '#c3c8c4';

export function panelFront(spec: PanelSpec) {
  const W = Math.round(spec.w * PX);
  const H = Math.round(spec.h * PX);
  const [c, ctx] = canvas(W, H);
  const X = (x: number) => (x + spec.w / 2) * PX;
  const Y = (y: number) => (spec.h - y) * PX;

  // Frame / seams
  ctx.fillStyle = '#5d6560';
  ctx.fillRect(0, 0, W, H);

  const paint = ctx.createLinearGradient(0, 0, 0, H);
  paint.addColorStop(0, PAINT_TOP);
  paint.addColorStop(1, PAINT_BOTTOM);

  // Top canopy band
  ctx.fillStyle = paint;
  ctx.fillRect(4, 4, W - 8, Y(spec.doors[spec.doors.length - 1][1]) - 10);

  for (const [y0, y1] of spec.doors) {
    const top = Y(y1);
    const bot = Y(y0);
    ctx.fillStyle = paint;
    ctx.fillRect(10, top, W - 20, bot - top);
    // bevel light from above-left
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillRect(10, top, W - 20, 2);
    ctx.fillRect(10, top, 2, bot - top);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(10, bot - 3, W - 20, 3);
    ctx.fillRect(W - 13, top, 3, bot - top);
    // hinges
    ctx.fillStyle = '#7d8580';
    const hh = Math.min(70, (bot - top) * 0.18);
    ctx.fillRect(10, top + 30, 5, hh);
    ctx.fillRect(10, bot - 30 - hh, 5, hh);
    // quarter-turn locks
    for (const ly of [top + 26, bot - 26]) {
      ctx.fillStyle = '#9aa19c';
      ctx.beginPath();
      ctx.arc(W - 36, ly, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4d5450';
      ctx.fillRect(W - 41, ly - 1.5, 10, 3);
    }
  }

  // Louvers
  for (const l of spec.louvers ?? []) {
    const slotW = 0.13 * PX;
    const slotH = 0.011 * PX;
    const gapX = 0.03 * PX;
    const gapY = 0.024 * PX;
    const totalW = l.cols * slotW + (l.cols - 1) * gapX;
    const totalH = l.rows * slotH + (l.rows - 1) * gapY;
    const x0 = X(l.x) - totalW / 2;
    const y0 = Y(l.y) - totalH / 2;
    for (let r = 0; r < l.rows; r++) {
      for (let col = 0; col < l.cols; col++) {
        const x = x0 + col * (slotW + gapX);
        const y = y0 + r * (slotH + gapY);
        ctx.fillStyle = '#1b1f22';
        rr(ctx, x, y, slotW, slotH, slotH / 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillRect(x + 4, y + slotH, slotW - 8, 1.5);
      }
    }
  }

  // Cutouts — dark recess with a soft shadow
  for (const k of spec.cutouts ?? []) {
    const x = X(k.x - k.w / 2);
    const y = Y(k.y + k.h / 2);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    rr(ctx, x - 6, y - 4, k.w * PX + 12, k.h * PX + 12, 6);
    ctx.fill();
    ctx.fillStyle = '#121417';
    ctx.fillRect(x - 2, y - 2, k.w * PX + 4, k.h * PX + 4);
  }

  // Engraved labels (black traffolyte, white text)
  for (const l of spec.labels ?? []) {
    const w = (l.w ?? 0.13) * PX;
    const h = 0.02 * PX;
    const x = X(l.x) - w / 2;
    const y = Y(l.y) - h / 2;
    ctx.fillStyle = '#16181b';
    rr(ctx, x, y, w, h, 2);
    ctx.fill();
    ctx.fillStyle = '#e8e8e2';
    ctx.font = `500 ${Math.round(h * 0.52)}px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(l.text, X(l.x), Y(l.y) + 1, w - 8);
  }

  if (spec.warning) {
    // Yellow caution label, a nod to the one on the old site's photo
    const cx = X(spec.warning.x);
    const cy = Y(spec.warning.y);
    const w = 0.15 * PX;
    const h = 0.065 * PX;
    const x0 = cx - w / 2;
    ctx.fillStyle = '#f5c000';
    rr(ctx, x0, cy - h / 2, w, h, 4);
    ctx.fill();
    const tx = x0 + h * 0.52;
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(tx, cy - h * 0.32);
    ctx.lineTo(tx + h * 0.34, cy + h * 0.28);
    ctx.lineTo(tx - h * 0.34, cy + h * 0.28);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = '#111';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${Math.round(h * 0.34)}px ${SANS}`;
    ctx.fillText('ϟ', tx, cy + h * 0.06);
    ctx.textAlign = 'left';
    ctx.font = `700 ${Math.round(h * 0.3)}px ${SANS}`;
    ctx.fillText(document.documentElement.lang === 'en' ? 'DANGER' : 'DİKKAT', x0 + h + 2, cy - h * 0.15);
    ctx.font = `500 ${Math.round(h * 0.22)}px ${MONO}`;
    ctx.fillText('440 V AC', x0 + h + 2, cy + h * 0.2);
  }

  grain(ctx, W, H, 7);
  return tex(c);
}

/* ------------------------------------------------------------------ */
/* Instruments                                                         */
/* ------------------------------------------------------------------ */

export interface MeterOpts {
  unit: string;
  min?: number;
  max: number;
  red?: number;
  sub?: string;
  decimals?: number;
}

/** Square 96×96 switchboard meter, 100° scale, pivot near the bottom. */
export const METER_ARC = 0.87;
export const METER_PIVOT = 0.84; // fraction of face height from top
export const METER_RADIUS = 0.62; // fraction of face width

export function meterFace(o: MeterOpts) {
  const S = 256;
  const [c, ctx] = canvas(S, S);
  const min = o.min ?? 0;
  ctx.fillStyle = '#f3f1ea';
  ctx.fillRect(0, 0, S, S);
  ctx.strokeStyle = '#d6d2c6';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, S - 6, S - 6);

  const cx = S / 2;
  const cy = S * METER_PIVOT;
  const R = S * METER_RADIUS;
  const a0 = -Math.PI / 2 - METER_ARC;
  const a1 = -Math.PI / 2 + METER_ARC;

  if (o.red != null) {
    const ar = a0 + (a1 - a0) * ((o.red - min) / (o.max - min));
    ctx.strokeStyle = '#d23a2e';
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.arc(cx, cy, R - 6, ar, a1);
    ctx.stroke();
  }

  ctx.strokeStyle = '#141414';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(cx, cy, R, a0, a1);
  ctx.stroke();

  const minor = 25;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i <= minor; i++) {
    const a = a0 + ((a1 - a0) * i) / minor;
    const major = i % 5 === 0;
    const r1 = R - (major ? 18 : 9);
    ctx.lineWidth = major ? 2.5 : 1.4;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
    ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    ctx.stroke();
    if (major) {
      const v = min + ((o.max - min) * i) / minor;
      ctx.fillStyle = '#141414';
      ctx.font = `500 17px ${SANS}`;
      ctx.fillText(v.toFixed(o.decimals ?? 0), cx + Math.cos(a) * (R - 34), cy + Math.sin(a) * (R - 34));
    }
  }
  ctx.fillStyle = '#141414';
  ctx.font = `700 30px ${SANS}`;
  ctx.fillText(o.unit, cx, cy - R * 0.36);
  if (o.sub) {
    ctx.font = `500 12px ${MONO}`;
    ctx.fillStyle = '#595959';
    ctx.fillText(o.sub, cx, cy - R * 0.36 + 26);
  }
  ctx.font = `500 10px ${MONO}`;
  ctx.fillStyle = '#7a7a7a';
  ctx.textAlign = 'left';
  ctx.fillText('CL 1.5', 16, S - 16);
  return tex(c);
}

export function synchroscopeFace() {
  const S = 384;
  const [c, ctx] = canvas(S, S);
  const cx = S / 2;
  const cy = S / 2;
  ctx.fillStyle = '#16181b';
  ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = '#f3f1ea';
  ctx.beginPath();
  ctx.arc(cx, cy, S * 0.47, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#141414';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, S * 0.38, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    const r0 = S * 0.38;
    const r1 = r0 - (i % 3 === 0 ? 16 : 8);
    ctx.lineWidth = i % 3 === 0 ? 3 : 1.5;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
    ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    ctx.stroke();
  }
  // in-phase window at 12 o'clock
  ctx.fillStyle = '#2a9d4b';
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, S * 0.38, -Math.PI / 2 - 0.12, -Math.PI / 2 + 0.12);
  ctx.closePath();
  ctx.globalAlpha = 0.35;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#141414';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 22px ${SANS}`;
  ctx.fillText('SYNCHROSCOPE', cx, cy + S * 0.2);
  ctx.font = `600 18px ${MONO}`;
  ctx.fillText('FAST ↻', cx + S * 0.2, cy - S * 0.1);
  ctx.fillText('↺ SLOW', cx - S * 0.2, cy - S * 0.1);
  return tex(c);
}

/** Black traffolyte name plate. */
export function namePlate(text: string, sub?: string) {
  const [c, ctx] = canvas(640, 112);
  ctx.fillStyle = '#121316';
  ctx.fillRect(0, 0, 640, 112);
  ctx.strokeStyle = '#2d3036';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 636, 108);
  for (const x of [18, 622]) {
    ctx.fillStyle = '#7f858c';
    ctx.beginPath();
    ctx.arc(x, 56, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#ecece6';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `600 ${sub ? 40 : 46}px ${SANS}`;
  ctx.fillText(text, 320, sub ? 44 : 58, 560);
  if (sub) {
    ctx.font = `500 22px ${MONO}`;
    ctx.fillStyle = '#b8bcc2';
    ctx.fillText(sub, 320, 84, 560);
  }
  return tex(c);
}

/** Air circuit breaker fascia. */
export function acbFascia(rating: string) {
  const W = 368;
  const H = 320;
  const [c, ctx] = canvas(W, H);
  ctx.fillStyle = '#2a2e35';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#3a3f48';
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, W - 16, H - 16);
  // rating plate
  ctx.fillStyle = '#c9ccd1';
  ctx.fillRect(24, 22, 150, 64);
  ctx.fillStyle = '#20242a';
  ctx.font = `700 22px ${SANS}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(rating, 34, 42);
  ctx.font = `500 12px ${MONO}`;
  ctx.fillText('Ue 690V  Icu 65kA', 34, 66);
  // status windows
  const win = (x: number, y: number, label: string, color: string) => {
    ctx.fillStyle = '#111';
    ctx.fillRect(x, y, 70, 34);
    ctx.fillStyle = color;
    ctx.fillRect(x + 4, y + 4, 62, 26);
    ctx.fillStyle = '#111';
    ctx.font = `700 14px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.fillText(label, x + 35, y + 18);
  };
  win(200, 24, 'I ON', '#d9342b');
  win(280, 24, 'CHGD', '#f2c200');
  // charging handle recess
  ctx.fillStyle = '#16191d';
  rr(ctx, 120, 110, 128, 150, 10);
  ctx.fill();
  // racking position indicator
  ctx.fillStyle = '#16191d';
  ctx.fillRect(24, H - 46, W - 48, 26);
  ctx.font = `500 11px ${MONO}`;
  ctx.fillStyle = '#9aa0a8';
  ctx.textAlign = 'center';
  ctx.fillText('CONN · TEST · DISC', W / 2, H - 33);
  // button legends
  ctx.font = `700 13px ${MONO}`;
  ctx.fillStyle = '#d0d3d8';
  ctx.fillText('ON', 62, 196);
  ctx.fillText('OFF', 306, 196);
  return tex(c);
}

/* ------------------------------------------------------------------ */
/* Live displays — redrawn on an interval                              */
/* ------------------------------------------------------------------ */

export interface Live {
  load: number; // 0..1
  dg1: number; // kW
  dg2: number;
  hz: number;
  volts: number;
  t: number;
}

const ALARMS = [
  ['ME', 'JACKET CW OUTLET TEMP', 'HIGH', '#ffb020'],
  ['DG2', 'LUB OIL PRESSURE', 'NORM', '#3ee08f'],
  ['E/R', 'BILGE WELL LEVEL', 'HIGH', '#ff5a4e'],
  ['BLR', 'FEED WATER LEVEL', 'NORM', '#3ee08f'],
  ['AC', 'START AIR PRESSURE', 'NORM', '#3ee08f'],
  ['DG1', 'EXH GAS TEMP CYL 4', 'ACK', '#ffb020'],
  ['FO', 'SETTLING TK TEMP', 'NORM', '#3ee08f'],
  ['ST', 'STEERING GEAR PUMP 2', 'RUN', '#2bbbe5'],
  ['PWR', 'INSULATION 440V BUS', 'NORM', '#3ee08f'],
  ['FW', 'GENERATOR FW TEMP', 'NORM', '#3ee08f'],
];

function screenBase(ctx: CanvasRenderingContext2D, W: number, H: number, title: string) {
  ctx.fillStyle = '#06101f';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#0d2244';
  ctx.fillRect(0, 0, W, 34);
  ctx.fillStyle = '#cfe6ff';
  ctx.font = `600 15px ${MONO}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, 14, 17);
}

export function drawAlarmScreen(ctx: CanvasRenderingContext2D, W: number, H: number, live: Live) {
  screenBase(ctx, W, H, 'ALARM & MONITORING');
  ctx.textAlign = 'right';
  ctx.fillStyle = '#7fa3d6';
  const sec = Math.floor(live.t) % 60;
  ctx.fillText(`14:${String(32 + Math.floor(live.t / 60) % 20).padStart(2, '0')}:${String(sec).padStart(2, '0')}`, W - 14, 17);
  const off = Math.floor(live.t / 3) % ALARMS.length;
  ctx.font = `500 14px ${MONO}`;
  for (let i = 0; i < 8; i++) {
    const [tag, text, state, col] = ALARMS[(i + off) % ALARMS.length];
    const y = 54 + i * 31;
    ctx.fillStyle = i % 2 ? '#081628' : '#0a1b31';
    ctx.fillRect(8, y - 13, W - 16, 28);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#5f7ea8';
    ctx.fillText(tag, 16, y + 1);
    ctx.fillStyle = '#dbe8fb';
    ctx.fillText(text, 70, y + 1);
    ctx.textAlign = 'right';
    ctx.fillStyle = col;
    const blink = state === 'HIGH' && Math.floor(live.t * 2) % 2 === 0;
    ctx.globalAlpha = blink ? 0.35 : 1;
    ctx.fillText(state, W - 16, y + 1);
    ctx.globalAlpha = 1;
  }
}

export function drawPowerScreen(ctx: CanvasRenderingContext2D, W: number, H: number, live: Live) {
  screenBase(ctx, W, H, 'POWER MANAGEMENT');
  ctx.textAlign = 'right';
  ctx.fillStyle = '#7fa3d6';
  ctx.fillText('AUTO', W - 14, 17);
  // bus line
  const busY = 150;
  ctx.strokeStyle = '#2bbbe5';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(30, busY);
  ctx.lineTo(W - 30, busY);
  ctx.stroke();
  const gens: [string, number, boolean][] = [
    ['DG1', live.dg1, true],
    ['DG2', live.dg2, true],
    ['DG3', 0, false],
  ];
  gens.forEach(([name, kw, on], i) => {
    const x = 90 + i * 150;
    ctx.strokeStyle = on ? '#2bbbe5' : '#3a4a66';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, busY);
    ctx.lineTo(x, 112);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, 82, 28, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = on ? '#dbe8fb' : '#5f7ea8';
    ctx.font = `600 16px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.fillText(name, x, 83);
    // breaker square
    ctx.fillStyle = on ? '#ff5a4e' : '#3ee08f';
    ctx.fillRect(x - 8, 118, 16, 16);
    // kW bar
    ctx.fillStyle = '#0d2244';
    ctx.fillRect(x - 40, 186, 80, 12);
    ctx.fillStyle = on ? '#2bbbe5' : '#3a4a66';
    ctx.fillRect(x - 40, 186, 80 * (kw / 600), 12);
    ctx.fillStyle = on ? '#dbe8fb' : '#5f7ea8';
    ctx.font = `500 14px ${MONO}`;
    ctx.fillText(on ? `${Math.round(kw)} kW` : 'STBY', x, 216);
  });
  ctx.textAlign = 'left';
  ctx.fillStyle = '#9fc0e8';
  ctx.font = `500 15px ${MONO}`;
  ctx.fillText(`BUS ${live.volts.toFixed(0)} V   ${live.hz.toFixed(1)} Hz   LOAD ${Math.round(live.load * 100)}%`, 24, H - 30);
}

export function drawHmiScreen(ctx: CanvasRenderingContext2D, W: number, H: number, live: Live) {
  screenBase(ctx, W, H, 'BILGE / BALLAST');
  const tanks: [string, number][] = [
    ['BW TK P', 0.62 + Math.sin(live.t * 0.2) * 0.04],
    ['BW TK S', 0.58 - Math.sin(live.t * 0.2) * 0.04],
    ['BILGE', 0.34 + Math.sin(live.t * 0.13) * 0.06],
  ];
  tanks.forEach(([name, lvl], i) => {
    const x = 30 + i * 120;
    const y = 60;
    const h = 150;
    ctx.strokeStyle = '#4c6a96';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, 70, h);
    ctx.fillStyle = name === 'BILGE' && lvl > 0.36 ? '#ffb020' : '#2bbbe5';
    ctx.globalAlpha = 0.85;
    ctx.fillRect(x + 3, y + h - h * lvl, 64, h * lvl - 3);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#dbe8fb';
    ctx.font = `500 13px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.fillText(name, x + 35, y + h + 18);
    ctx.fillText(`${Math.round(lvl * 100)}%`, x + 35, y - 12);
  });
  // pumps
  ['P1', 'P2'].forEach((p, i) => {
    const x = 410;
    const y = 90 + i * 80;
    const run = i === 0 || Math.floor(live.t / 6) % 2 === 0;
    ctx.strokeStyle = run ? '#3ee08f' : '#4c6a96';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = run ? '#3ee08f' : '#4c6a96';
    ctx.font = `600 14px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.fillText(p, x, y + 1);
  });
  ctx.fillStyle = '#7fa3d6';
  ctx.textAlign = 'left';
  ctx.font = `500 13px ${MONO}`;
  ctx.fillText('MODE: AUTO   ALARM: 1', 24, H - 18);
}

export function drawLcd(ctx: CanvasRenderingContext2D, W: number, H: number, lines: string[]) {
  ctx.fillStyle = '#0b1a0f';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#7dff9e';
  const longest = Math.max(...lines.map((l) => l.length));
  const size = Math.floor(Math.min(H / (lines.length + 0.8), (W - 20) / (longest * 0.61)));
  ctx.font = `500 ${size}px ${MONO}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  lines.forEach((l, i) => ctx.fillText(l, 10, ((i + 0.9) * H) / (lines.length + 0.8)));
}

/* ------------------------------------------------------------------ */
/* Surfaces                                                            */
/* ------------------------------------------------------------------ */

export function deckPlate() {
  const S = 256;
  const [c, ctx] = canvas(S, S);
  ctx.fillStyle = '#151c2c';
  ctx.fillRect(0, 0, S, S);
  ctx.save();
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const cx = x * 64 + 32 + (y % 2 ? 32 : 0);
      const cy = y * 64 + 32;
      ctx.save();
      ctx.translate(cx % S, cy);
      ctx.rotate(((x + y) % 2 ? 1 : -1) * 0.78);
      ctx.fillStyle = '#1d2539';
      rr(ctx, -20, -4, 40, 8, 4);
      ctx.fill();
      ctx.restore();
    }
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, S, S);
  grain(ctx, S, S, 10);
  const t = tex(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function rubberMat() {
  const [c, ctx] = canvas(64, 64);
  ctx.fillStyle = '#0c0e12';
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = '#16191f';
  for (let y = 0; y < 64; y += 8) ctx.fillRect(0, y, 64, 3);
  const t = tex(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function consoleSlope() {
  const W = 1440;
  const H = 400;
  const [c, ctx] = canvas(W, H);
  ctx.fillStyle = '#8c949a';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#e9eef2';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(60, 120);
  ctx.lineTo(1380, 120);
  ctx.moveTo(200, 120);
  ctx.lineTo(200, 300);
  ctx.moveTo(520, 120);
  ctx.lineTo(520, 300);
  ctx.moveTo(900, 120);
  ctx.lineTo(900, 300);
  ctx.moveTo(1220, 120);
  ctx.lineTo(1220, 300);
  ctx.stroke();
  ctx.fillStyle = '#16181b';
  ctx.font = `600 22px ${MONO}`;
  ctx.textAlign = 'center';
  ['ME CONTROL', 'FO SYSTEM', 'CW SYSTEM', 'BILGE'].forEach((t, i) => ctx.fillText(t, [200, 520, 900, 1220][i], 60));
  grain(ctx, W, H, 6);
  return tex(c);
}
