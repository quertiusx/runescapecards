// Card faces drawn on <canvas> in the style of the Old School RuneScape
// interface. Portraits are low-poly 3D models (models.js) rendered small,
// outlined and scaled up with hard pixels. No external images.
import { CARDS, STYLES, KEYWORDS } from './cards.js';
import { wikiImage } from './wikiArt.js';

export const CARD_W = 500, CARD_H = 700;
export const TOKEN_W = 500, TOKEN_H = 640;
const INK = '#1b120b';

// ---------------------------------------------------------------- utils
function hex(c) {
  if (c.startsWith('rgb')) return c.match(/[\d.]+/g).slice(0, 3).map(Number);
  c = c.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(c.substr(i, 2), 16));
}
export function shade(c, amt) {
  const [r, g, b] = hex(c);
  const f = (v) => Math.max(0, Math.min(255, Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt))));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}
function rgba(c, a) { const [r, g, b] = hex(c); return `rgba(${r},${g},${b},${a})`; }
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function paint(ctx, pathFn, fill, stroke = INK, lw = 4) {
  ctx.beginPath(); pathFn();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.lineJoin = 'round'; ctx.stroke(); }
}
const E = (ctx, x, y, rx, ry, rot = 0) => () => ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
const P = (ctx, pts) => () => { ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); };
function radial(ctx, x, y, r, c0, c1) { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, c0); g.addColorStop(1, c1); return g; }
function linear(ctx, x0, y0, x1, y1, stops) { const g = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; }
function glow(ctx, x, y, r, color, a = 0.8) { ctx.fillStyle = radial(ctx, x, y, r, rgba(color, a), rgba(color, 0)); ctx.fillRect(x - r, y - r, r * 2, r * 2); }
// deterministic pseudo-random for textures
function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function hashStr(str) { let h = 2166136261; for (const ch of str) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; }

// ---------------------------------------------------------------- backgrounds (400 x 280)
const AW = 400, AH = 280;
function background(ctx, bg, seed) {
  const R = rng(seed);
  const sky = (top, bot) => { ctx.fillStyle = linear(ctx, 0, 0, 0, AH, [[0, top], [1, bot]]); ctx.fillRect(0, 0, AW, AH); };
  const hills = (col, y, amp) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, AH); for (let x = 0; x <= AW; x += 20) ctx.lineTo(x, y - Math.sin(x / 60 + seed) * amp - R() * 6); ctx.lineTo(AW, AH); ctx.fill(); };
  const bricks = (base, mortar) => {
    ctx.fillStyle = mortar; ctx.fillRect(0, 0, AW, AH);
    for (let row = 0; row < 12; row++) for (let col = -1; col < 9; col++) {
      const x = col * 52 + (row % 2) * 26, y = row * 26;
      ctx.fillStyle = shade(base, (R() - 0.5) * 0.25); ctx.fillRect(x + 2, y + 2, 48, 22);
    }
  };
  switch (bg) {
    case 'farm': sky('#8cc4ef', '#d9efff'); hills('#7fb24a', 210, 10); ctx.fillStyle = '#7a5530';
      for (let x = 10; x < AW; x += 60) { ctx.fillRect(x, 175, 8, 50); } ctx.fillRect(0, 185, AW, 6); ctx.fillRect(0, 205, AW, 6); hills('#5f9a35', 250, 6); break;
    case 'lumbridge': sky('#79b6ea', '#cfe8ff'); hills('#6e9f45', 200, 14);
      ctx.fillStyle = '#9a9a92'; ctx.fillRect(250, 120, 90, 80); ctx.fillRect(240, 95, 25, 105); ctx.fillRect(325, 95, 25, 105);
      ctx.fillStyle = '#6e6e68'; for (let x = 240; x < 350; x += 12) ctx.fillRect(x, 90, 7, 8); ctx.fillStyle = '#3a6fd8'; ctx.fillRect(262, 60, 3, 36); ctx.fillRect(265, 60, 18, 12);
      hills('#4f8a30', 240, 8); break;
    case 'castle': bricks('#7c7a74', '#4a4844'); ctx.fillStyle = radial(ctx, 300, 70, 120, 'rgba(255,220,150,0.45)', 'rgba(0,0,0,0)'); ctx.fillRect(0, 0, AW, AH);
      ctx.fillStyle = '#2a2a3a'; rr(ctx, 280, 30, 50, 80, 25); ctx.fill(); ctx.fillStyle = '#8fb0e0'; rr(ctx, 286, 36, 38, 70, 19); ctx.fill(); break;
    case 'dungeon': sky('#3a2f28', '#140f0c'); for (let i = 0; i < 18; i++) { ctx.fillStyle = `rgba(0,0,0,${0.2 + R() * 0.3})`; ctx.beginPath(); ctx.ellipse(R() * AW, R() * AH, 30 + R() * 50, 20 + R() * 30, 0, 0, 7); ctx.fill(); }
      glow(ctx, 60, 80, 90, '#ff9a3a', 0.5); break;
    case 'lava': sky('#5a1408', '#1a0604'); for (let i = 0; i < 6; i++) glow(ctx, R() * AW, 200 + R() * 80, 80, '#ff6a10', 0.6);
      ctx.fillStyle = '#1a0a06'; ctx.beginPath(); ctx.moveTo(0, AH); for (let x = 0; x <= AW; x += 25) ctx.lineTo(x, 230 + R() * 25); ctx.lineTo(AW, AH); ctx.fill(); break;
    case 'wilderness': sky('#4a1a12', '#8a4a2a'); hills('#3a2418', 220, 10); ctx.strokeStyle = '#1a0e08'; ctx.lineWidth = 5;
      for (const x of [40, 350]) { ctx.beginPath(); ctx.moveTo(x, 230); ctx.lineTo(x + 5, 150); ctx.lineTo(x - 15, 120); ctx.moveTo(x + 4, 170); ctx.lineTo(x + 25, 140); ctx.stroke(); } break;
    case 'arcane': ctx.fillStyle = radial(ctx, AW / 2, AH / 2, 260, '#5a3aa8', '#120a2a'); ctx.fillRect(0, 0, AW, AH);
      for (let i = 0; i < 40; i++) { ctx.fillStyle = `rgba(200,220,255,${R()})`; ctx.fillRect(R() * AW, R() * AH, 2, 2); } break;
    case 'sky': sky('#4a8ad8', '#e8f0ff'); ctx.fillStyle = 'rgba(255,255,255,0.8)'; for (let i = 0; i < 5; i++) { const x = R() * AW, y = 150 + R() * 120; ctx.beginPath(); ctx.ellipse(x, y, 60, 18, 0, 0, 7); ctx.ellipse(x + 30, y - 10, 40, 20, 0, 0, 7); ctx.fill(); } break;
    case 'swamp': sky('#2a3a1a', '#0e1608'); ctx.fillStyle = '#1e3a2a'; ctx.fillRect(0, 210, AW, 70); for (let i = 0; i < 12; i++) { ctx.fillStyle = `rgba(120,200,80,${R() * 0.25})`; ctx.beginPath(); ctx.ellipse(R() * AW, 220 + R() * 50, 30, 5, 0, 0, 7); ctx.fill(); } break;
    case 'desert': sky('#f0b860', '#ffe8b0'); hills('#d8a85a', 210, 16); hills('#c49048', 245, 8); glow(ctx, 330, 60, 60, '#fff0a0', 0.9); break;
    case 'forest': sky('#6a9a4a', '#2a4a1a'); for (let i = 0; i < 9; i++) { const x = R() * AW; ctx.fillStyle = '#4a3420'; ctx.fillRect(x - 6, 80, 12, 200); ctx.fillStyle = shade('#2f6a2a', (R() - 0.5) * 0.4); ctx.beginPath(); ctx.arc(x, 80, 50, 0, 7); ctx.fill(); } break;
    case 'tavern': sky('#5a3a1e', '#2a1a0c'); ctx.fillStyle = '#3a2410'; for (let x = 0; x < AW; x += 44) ctx.fillRect(x, 0, 6, AH); glow(ctx, 330, 90, 120, '#ffb050', 0.45); break;
    case 'sea': sky('#5aa0d8', '#1a4a7a'); ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 3; for (let y = 60; y < AH; y += 28) { ctx.beginPath(); for (let x = 0; x <= AW; x += 10) ctx.lineTo(x, y + Math.sin(x / 20 + y) * 4); ctx.stroke(); } break;
    case 'night': sky('#0e1430', '#2a1a3a'); ctx.fillStyle = '#f4f0d8'; ctx.beginPath(); ctx.arc(320, 60, 30, 0, 7); ctx.fill(); glow(ctx, 320, 60, 90, '#f4f0d8', 0.3);
      ctx.fillStyle = '#0a0a14'; ctx.fillRect(20, 120, 80, 160); ctx.beginPath(); ctx.moveTo(10, 120); ctx.lineTo(60, 70); ctx.lineTo(110, 120); ctx.fill(); ctx.fillStyle = '#ffd040'; ctx.fillRect(48, 150, 10, 16); break;
    case 'holy': ctx.fillStyle = radial(ctx, AW / 2, 100, 260, '#fffbe8', '#7aa0d8'); ctx.fillRect(0, 0, AW, AH);
      ctx.strokeStyle = 'rgba(255,240,180,0.6)'; ctx.lineWidth = 6; for (let a = 0; a < 16; a++) { ctx.beginPath(); ctx.moveTo(AW / 2, 100); ctx.lineTo(AW / 2 + Math.cos(a / 16 * Math.PI * 2) * 400, 100 + Math.sin(a / 16 * Math.PI * 2) * 400); ctx.stroke(); } break;
    case 'zamorak': sky('#2a0606', '#7a1010'); for (let i = 0; i < 8; i++) glow(ctx, R() * AW, R() * AH, 60, '#ff3010', 0.4); break;
    case 'gwd': bricks('#6a645a', '#3a362f'); ctx.fillStyle = 'rgba(200,220,255,0.15)'; ctx.fillRect(0, 0, AW, AH); glow(ctx, 200, 60, 160, '#a8c0e0', 0.35); break;
    case 'abyss': ctx.fillStyle = radial(ctx, AW / 2, AH / 2, 260, '#5a1a3a', '#0a0410'); ctx.fillRect(0, 0, AW, AH);
      ctx.strokeStyle = 'rgba(160,40,90,0.5)'; ctx.lineWidth = 8; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(R() * AW, AH); ctx.bezierCurveTo(R() * AW, 150, R() * AW, 100, R() * AW, 0); ctx.stroke(); } break;
    case 'gold': ctx.fillStyle = radial(ctx, AW / 2, AH / 2, 260, '#ffe08a', '#7a4a10'); ctx.fillRect(0, 0, AW, AH); break;
    default: sky('#444', '#111');
  }
}


// ---------------------------------------------------------------- OSRS palette
export const OS = {
  stone: '#3e3529', stoneLight: '#5d5447', stoneDark: '#2b241c', black: '#000000',
  orange: '#ff981f', yellow: '#ffff00', white: '#ffffff', green: '#00ff00', red: '#ff3020', cyan: '#00ffff',
  parch: '#d8c8a0', parchDark: '#b8a47a', ink: '#2a1a0a',
};
export const PIXEL_FONT = '"Pixelify Sans", "Courier New", monospace';

// ---------------------------------------------------------------- pixel helpers
function smallCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

// Draw with shapes on a tiny canvas, snap alpha to hard pixels and outline in
// black, like an OSRS sprite. Returns the tiny canvas.
export function pixelSprite(w, h, draw) {
  const c = smallCanvas(w, h); const ctx = c.getContext('2d');
  draw(ctx);
  const img = ctx.getImageData(0, 0, w, h), d = img.data;
  const solid = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) { if (d[i * 4 + 3] > 110) { solid[i] = 1; d[i * 4 + 3] = 255; } else d[i * 4 + 3] = 0; }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; if (solid[i]) continue;
    if ((x > 0 && solid[i - 1]) || (x < w - 1 && solid[i + 1]) || (y > 0 && solid[i - w]) || (y < h - 1 && solid[i + w])) { d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = 0; d[i * 4 + 3] = 255; }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function blit(ctx, src, x, y, w, h) {
  const s = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  ctx.imageSmoothingEnabled = s;
}

const ICONS = {};
function icon(name) {
  if (ICONS[name]) return ICONS[name];
  const make = {
    melee: () => pixelSprite(18, 18, (c) => {
      c.translate(9, 9); c.rotate(Math.PI / 4);
      c.fillStyle = '#d8dce4'; c.fillRect(-1.5, -9, 3, 11); c.fillStyle = '#8a8e98'; c.fillRect(0, -9, 1.5, 11);
      c.fillStyle = '#d8a830'; c.fillRect(-4.5, 2, 9, 2); c.fillStyle = '#6a4020'; c.fillRect(-1, 4, 2, 4);
    }),
    ranged: () => pixelSprite(18, 18, (c) => {
      c.strokeStyle = '#8a5a2a'; c.lineWidth = 2.2; c.beginPath(); c.arc(4, 9, 8, -1.2, 1.2); c.stroke();
      c.strokeStyle = '#e8e0d0'; c.lineWidth = 1; c.beginPath(); c.moveTo(7, 1.5); c.lineTo(7, 16.5); c.stroke();
      c.fillStyle = '#b8bcc4'; c.fillRect(3, 8, 12, 1.6); c.fillStyle = '#c8c8d0'; c.beginPath(); c.moveTo(17, 9); c.lineTo(13, 6.5); c.lineTo(13, 11.5); c.fill();
      c.fillStyle = '#e83030'; c.fillRect(2, 7, 2, 4);
    }),
    magic: () => pixelSprite(18, 18, (c) => {
      c.fillStyle = '#3a5ad8'; c.beginPath(); c.moveTo(2, 15); c.lineTo(16, 15); c.lineTo(11, 2); c.lineTo(6, 9); c.closePath(); c.fill();
      c.fillStyle = '#2a3a98'; c.fillRect(1, 14, 16, 2.5);
      c.fillStyle = '#ffe040'; c.fillRect(8, 9, 2, 2); c.fillRect(11, 6, 1.5, 1.5);
    }),
    all: () => pixelSprite(18, 18, (c) => {
      c.fillStyle = '#ff8a10'; c.beginPath(); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 3.5 : 8.5; c.lineTo(9 + Math.cos(a) * r, 9 + Math.sin(a) * r); } c.fill();
      c.fillStyle = '#ffe060'; c.fillRect(7.5, 7.5, 3, 3);
    }),
    hp: () => pixelSprite(18, 18, (c) => {
      c.fillStyle = '#d42020'; c.beginPath(); c.moveTo(9, 16); c.bezierCurveTo(-3, 7, 3, -1, 9, 5); c.bezierCurveTo(15, -1, 21, 7, 9, 16); c.fill();
      c.fillStyle = '#ff8a8a'; c.fillRect(4, 5, 2, 2);
    }),
    atk: () => icon('melee'),
    rune: () => pixelSprite(22, 22, (c) => {
      c.fillStyle = '#7a7470'; c.beginPath(); c.ellipse(11, 11, 10, 9.5, 0, 0, 7); c.fill();
      c.fillStyle = '#9a948e'; c.beginPath(); c.ellipse(10, 9, 8, 7, 0, 0, 7); c.fill();
      c.fillStyle = '#5a5450'; c.fillRect(4, 16, 14, 2);
    }),
    guard: () => pixelSprite(16, 16, (c) => {
      c.fillStyle = '#a8acb4'; c.beginPath(); c.moveTo(2, 2); c.lineTo(14, 2); c.lineTo(13, 9); c.lineTo(8, 15); c.lineTo(3, 9); c.closePath(); c.fill();
      c.fillStyle = '#d8a830'; c.fillRect(7, 3, 2, 10); c.fillRect(4, 6, 8, 2);
    }),
    charge: () => pixelSprite(16, 16, (c) => {
      c.fillStyle = '#ffe040'; c.beginPath(); c.moveTo(10, 1); c.lineTo(3, 9); c.lineTo(8, 9); c.lineTo(5, 15); c.lineTo(13, 6); c.lineTo(8, 6); c.closePath(); c.fill();
    }),
    venom: () => pixelSprite(16, 16, (c) => {
      c.fillStyle = '#30d040'; c.beginPath(); c.moveTo(8, 1); c.quadraticCurveTo(15, 10, 8, 15); c.quadraticCurveTo(1, 10, 8, 1); c.fill();
      c.fillStyle = '#a0ffa0'; c.fillRect(5, 8, 2, 3);
    }),
    vampyric: () => pixelSprite(16, 16, (c) => {
      c.fillStyle = '#8a1020'; c.fillRect(2, 3, 12, 5);
      c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(4, 8); c.lineTo(6, 8); c.lineTo(5, 13); c.fill(); c.beginPath(); c.moveTo(10, 8); c.lineTo(12, 8); c.lineTo(11, 13); c.fill();
    }),
  }[name];
  ICONS[name] = make ? make() : pixelSprite(16, 16, () => {});
  return ICONS[name];
}
export function iconCanvas(name) { return icon(name); }

export function styleIcon(ctx, style, x, y, r) {
  blit(ctx, icon(style), x - r, y - r, r * 2, r * 2);
}

// OSRS text: flat colour with a hard 1px black drop shadow (scaled up)
function osText(ctx, text, x, y, color, size, { align = 'center', shadow = Math.max(2, Math.round(size / 11)), weight = 700 } = {}) {
  ctx.font = `${weight} ${size}px ${PIXEL_FONT}`;
  ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#000'; ctx.fillText(text, x + shadow, y + shadow);
  ctx.fillStyle = color; ctx.fillText(text, x, y);
}
function fitFont(ctx, text, maxW, size, weight = 700) {
  let s = size;
  do { ctx.font = `${weight} ${s}px ${PIXEL_FONT}`; s -= 1; } while (ctx.measureText(text).width > maxW && s > 10);
  return s + 1;
}
function wrap(ctx, text, maxW) {
  const words = text.split(' '); const lines = []; let line = '';
  for (const w of words) { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
  if (line) lines.push(line);
  return lines;
}

// Stone interface panel with the classic bevel.
const stoneTex = new Map();
function stonePattern(ctx, base) {
  if (!stoneTex.has(base)) {
    const c = smallCanvas(64, 64), x = c.getContext('2d'), R = rng(hashStr(base));
    x.fillStyle = base; x.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 160; i++) { x.fillStyle = R() < 0.5 ? 'rgba(0,0,0,0.13)' : 'rgba(255,240,210,0.06)'; x.fillRect(Math.floor(R() * 32) * 2, Math.floor(R() * 32) * 2, 2 + Math.floor(R() * 2) * 2, 2); }
    stoneTex.set(base, c);
  }
  return ctx.createPattern(stoneTex.get(base), 'repeat');
}
function panel(ctx, x, y, w, h, { base = OS.stone, bevel = 4, inset = false } = {}) {
  ctx.fillStyle = OS.black; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = stonePattern(ctx, base); ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
  ctx.fillStyle = inset ? OS.stoneDark : OS.stoneLight;
  ctx.fillRect(x + 3, y + 3, w - 6, bevel); ctx.fillRect(x + 3, y + 3, bevel, h - 6);
  ctx.fillStyle = inset ? OS.stoneLight : OS.stoneDark;
  ctx.fillRect(x + 3, y + h - 3 - bevel, w - 6, bevel); ctx.fillRect(x + w - 3 - bevel, y + 3, bevel, h - 6);
}
function rivet(ctx, x, y) { ctx.fillStyle = '#000'; ctx.fillRect(x - 6, y - 6, 12, 12); ctx.fillStyle = '#8a7a60'; ctx.fillRect(x - 4, y - 4, 8, 8); ctx.fillStyle = '#c8b890'; ctx.fillRect(x - 4, y - 4, 4, 4); }

function styleColor(card) {
  if (card.type === 'unit') return { melee: '#a8281a', ranged: '#2f7a22', magic: '#2a48b0', all: '#c88a10' }[card.style];
  if (card.sub === 'Equipment' || card.sub === 'Special Attack') return '#6a6a72';
  if (card.sub === 'Food' || card.sub === 'Potion' || card.sub === 'Currency') return '#8a6a2a';
  return '#6a2a8a';
}

// ---------------------------------------------------------------- art (pixel models)
const ART_W = 216, ART_H = 150; // low-res render size; drawn x2
let modelsMod = null;
export async function loadModels() { if (!modelsMod) modelsMod = await import('./models.js'); return modelsMod; }

const artCache = new Map();
let useWiki = true;
// 'wiki' = official OSRS Wiki pictures where loaded, 'models' = pixel models only
export function setArtMode(mode) { useWiki = mode !== 'models'; artCache.clear(); }

function wikiArtCanvas(card, img) {
  const out = smallCanvas(ART_W * 2, ART_H * 2), ctx = out.getContext('2d');
  // pixelated painted backdrop, then the official picture on top
  const low = smallCanvas(ART_W, ART_H), lc = low.getContext('2d');
  lc.save(); lc.scale(ART_W / AW, ART_H / AH); background(lc, card.art.bg, hashStr(card.id)); lc.restore();
  blit(ctx, low, 0, 0, out.width, out.height);
  const g = ctx.createRadialGradient(out.width / 2, out.height / 2, 40, out.width / 2, out.height / 2, 300); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, out.width, out.height);
  const pad = 14, maxW = out.width - pad * 2, maxH = out.height - pad * 2;
  const k = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight);
  const w = img.naturalWidth * k, h = img.naturalHeight * k;
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
  ctx.drawImage(img, (out.width - w) / 2, card.type === 'unit' ? out.height - pad - h : (out.height - h) / 2, w, h);
  return out;
}

function artCanvas(card) {
  if (artCache.has(card.id)) return artCache.get(card.id);
  const img = useWiki && wikiImage(card.id);
  if (img) { const c = wikiArtCanvas(card, img); artCache.set(card.id, c); return c; }
  const low = smallCanvas(ART_W, ART_H), ctx = low.getContext('2d');
  ctx.save(); ctx.scale(ART_W / AW, ART_H / AH); background(ctx, card.art.bg, hashStr(card.id)); ctx.restore();
  // darken edges a touch so the model pops
  const g = ctx.createRadialGradient(ART_W / 2, ART_H / 2, 20, ART_W / 2, ART_H / 2, 150); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, ART_W, ART_H);
  if (modelsMod && modelsMod.CARD_MODELS[card.id]) {
    const isItem = card.type === 'spell';
    const tall = ['humanoid', 'imp', 'demon', 'tzhaar', 'bird'].includes(card.art.kind);
    const m = modelsMod.renderPixelModel(modelsMod.CARD_MODELS[card.id](), ART_W, ART_H, isItem
      ? { yaw: 0.2, pitch: 0.35, fill: 0.72 }
      : tall ? { yaw: -0.45, pitch: 0.1, fill: 1.35, focus: 0.17 } : { yaw: -0.55, pitch: 0.2, fill: 0.95 });
    ctx.drawImage(m, 0, 0);
  }
  const out = smallCanvas(ART_W * 2, ART_H * 2);
  blit(out.getContext('2d'), low, 0, 0, ART_W * 2, ART_H * 2);
  artCache.set(card.id, out);
  return out;
}

export function portraitCanvas(type) {
  // menu portrait of a duellist, standing, OSRS style
  const low = smallCanvas(120, 84), ctx = low.getContext('2d');
  ctx.save(); ctx.scale(120 / AW, 84 / AH); background(ctx, { knight: 'castle', wizard: 'arcane', ranger: 'forest' }[type], 7); ctx.restore();
  if (modelsMod) ctx.drawImage(modelsMod.renderPixelModel(modelsMod.AVATAR_MODELS[type]('stand').root, 120, 84, { yaw: -0.4, pitch: 0.1, fill: 0.92 }), 0, 0);
  const out = smallCanvas(480, 336); blit(out.getContext('2d'), low, 0, 0, 480, 336);
  return out;
}

// ---------------------------------------------------------------- full card
function statBox(ctx, x, y, kind, value, delta) {
  panel(ctx, x, y, 104, 70, { base: OS.stoneDark, bevel: 3, inset: true });
  blit(ctx, icon(kind), x + 8, y + 12, 46, 46);
  const col = delta > 0 ? OS.green : delta < 0 ? OS.red : OS.yellow;
  osText(ctx, String(value), x + 78, y + 37, col, 44, { shadow: 4 });
}

function costRune(ctx, x, y, cost) {
  blit(ctx, icon('rune'), x - 40, y - 40, 80, 80);
  osText(ctx, String(cost), x, y + 2, OS.yellow, 46, { shadow: 4 });
}

export function drawCard(canvas, cardId) {
  const card = CARDS[cardId];
  canvas.width = CARD_W; canvas.height = CARD_H;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  panel(ctx, 0, 0, CARD_W, CARD_H, { bevel: 6 });
  // coloured inner trim shows the card type at a glance
  ctx.fillStyle = styleColor(card); ctx.fillRect(14, 14, CARD_W - 28, 6); ctx.fillRect(14, CARD_H - 20, CARD_W - 28, 6);
  // name bar
  panel(ctx, 24, 26, CARD_W - 48, 62, { base: OS.stoneDark, bevel: 3, inset: true });
  const ns = fitFont(ctx, card.name, CARD_W - 190, 34);
  osText(ctx, card.name, CARD_W / 2 + 30, 58, OS.orange, ns);
  costRune(ctx, 66, 58, card.cost);
  // art
  const ax = 24, ay = 96, aw = CARD_W - 48, ah = 300;
  ctx.fillStyle = '#000'; ctx.fillRect(ax, ay, aw, ah);
  blit(ctx, artCanvas(card), ax + 3, ay + 3, aw - 6, ah - 6);
  // type line
  panel(ctx, 24, 402, CARD_W - 48, 44, { base: OS.stoneDark, bevel: 2, inset: true });
  let tl = card.type === 'unit' ? STYLES[card.style].name : card.sub || 'Spell';
  if (card.type === 'unit' && card.level) tl += `  (level-${card.level})`;
  osText(ctx, tl, CARD_W / 2, 425, card.type === 'unit' ? OS.yellow : OS.cyan, 24, { shadow: 2 });
  if (card.type === 'unit') blit(ctx, icon(card.style), CARD_W - 74, 405, 38, 38);
  // text box (parchment, like a quest scroll)
  const tbY = 454, tbH = card.type === 'unit' ? 158 : 216;
  ctx.fillStyle = '#000'; ctx.fillRect(28, tbY, CARD_W - 56, tbH);
  ctx.fillStyle = OS.parch; ctx.fillRect(31, tbY + 3, CARD_W - 62, tbH - 6);
  ctx.fillStyle = OS.parchDark; ctx.fillRect(31, tbY + tbH - 9, CARD_W - 62, 6); ctx.fillRect(CARD_W - 37, tbY + 3, 6, tbH - 6);
  let y = tbY + 30;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (card.kw.length) {
    let kx = CARD_W / 2 - (card.kw.length * 130) / 2 + 16;
    for (const k of card.kw) {
      blit(ctx, icon(k), kx - 16, y - 16, 32, 32);
      ctx.font = `700 25px ${PIXEL_FONT}`; ctx.fillStyle = '#7a1a00'; ctx.textAlign = 'left'; ctx.fillText(KEYWORDS[k].name, kx + 22, y + 1);
      kx += 130;
    }
    ctx.textAlign = 'center'; y += 34;
  }
  if (card.text) {
    ctx.font = `600 23px ${PIXEL_FONT}`; ctx.fillStyle = OS.ink;
    for (const line of wrap(ctx, card.text, CARD_W - 100)) { ctx.fillText(line, CARD_W / 2, y); y += 27; }
    y += 4;
  }
  if (card.flavor) {
    ctx.font = `400 19px ${PIXEL_FONT}`; ctx.fillStyle = '#5a3a1a';
    const maxLines = Math.floor((tbY + tbH - 10 - y) / 22);
    wrap(ctx, card.flavor, CARD_W - 104).slice(0, Math.max(0, maxLines)).forEach((line) => { ctx.fillText(line, CARD_W / 2, y); y += 22; });
  }
  if (card.type === 'unit') {
    statBox(ctx, 24, CARD_H - 88, 'atk', card.atk, 0);
    statBox(ctx, CARD_W - 128, CARD_H - 88, 'hp', card.hp, 0);
  }
  for (const [rx, ry] of [[12, 12], [CARD_W - 12, 12], [12, CARD_H - 12], [CARD_W - 12, CARD_H - 12]]) rivet(ctx, rx, ry);
  return canvas;
}

// ---------------------------------------------------------------- board token
export function drawToken(canvas, unit) {
  const card = CARDS[unit.id];
  canvas.width = TOKEN_W; canvas.height = TOKEN_H;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const guard = unit.kw.includes('guard');
  panel(ctx, 0, 0, TOKEN_W, TOKEN_H, { base: guard ? '#6a6a72' : OS.stone, bevel: 6 });
  if (guard) { ctx.fillStyle = '#c8ccd4'; ctx.fillRect(8, 8, TOKEN_W - 16, 8); ctx.fillRect(8, TOKEN_H - 16, TOKEN_W - 16, 8); ctx.fillRect(8, 8, 8, TOKEN_H - 16); ctx.fillRect(TOKEN_W - 16, 8, 8, TOKEN_H - 16); }
  ctx.fillStyle = styleColor(card); ctx.fillRect(18, 18, TOKEN_W - 36, 6);
  const ax = 22, ay = 28, aw = TOKEN_W - 44, ah = 420;
  ctx.fillStyle = '#000'; ctx.fillRect(ax, ay, aw, ah);
  // crop the art so the monster fills the token
  const art = artCanvas(card);
  const sw = art.width * 0.72, sh = art.height;
  ctx.drawImage(art, (art.width - sw) / 2, 0, sw, sh, ax + 3, ay + 3, aw - 6, ah - 6);
  if (unit.frozen) {
    ctx.fillStyle = 'rgba(120,200,255,0.42)'; ctx.fillRect(ax + 3, ay + 3, aw - 6, ah - 6);
    ctx.fillStyle = 'rgba(230,248,255,0.85)'; for (let i = 0; i < 12; i++) ctx.fillRect(ax + 20 + ((i * 97) % (aw - 40)), ay + 20 + ((i * 53) % (ah - 40)), 12, 12);
  }
  // name strip
  panel(ctx, 22, 452, TOKEN_W - 44, 58, { base: OS.stoneDark, bevel: 3, inset: true });
  const ns = fitFont(ctx, card.name, TOKEN_W - 80, 34);
  osText(ctx, card.name, TOKEN_W / 2, 482, OS.yellow, ns);
  blit(ctx, icon(unit.style), TOKEN_W - 92, 38, 64, 64);
  let kx = 34;
  for (const k of unit.kw) { ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(kx - 2, 36, 60, 60); blit(ctx, icon(k), kx + 2, 40, 52, 52); kx += 64; }
  const hpDelta = unit.hp < unit.maxHp ? -1 : unit.maxHp > card.hp ? 1 : 0;
  // big stat boxes
  for (const [x, kind, val, delta] of [[22, 'atk', unit.atk, unit.atk - card.atk], [TOKEN_W - 172, 'hp', unit.hp, hpDelta]]) {
    panel(ctx, x, TOKEN_H - 122, 150, 100, { base: OS.stoneDark, bevel: 3, inset: true });
    blit(ctx, icon(kind), x + 8, TOKEN_H - 108, 70, 70);
    osText(ctx, String(val), x + 110, TOKEN_H - 72, delta > 0 ? OS.green : delta < 0 ? OS.red : OS.yellow, 64, { shadow: 5 });
  }
  return canvas;
}

export function tokenKey(u) {
  return `${u.id}|${u.atk}|${u.hp}|${u.maxHp}|${u.kw.join(',')}|${u.frozen ? 1 : 0}`;
}

// ---------------------------------------------------------------- card back
export function drawCardBack(canvas) {
  canvas.width = 250; canvas.height = 350;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  panel(ctx, 0, 0, 250, 350, { base: '#4a2a1e', bevel: 5 });
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  for (let y = 20; y < 330; y += 16) for (let x = 20 + ((y / 16) % 2) * 8; x < 230; x += 16) ctx.fillRect(x, y, 6, 6);
  blit(ctx, icon('rune'), 65, 115, 120, 120);
  blit(ctx, icon('all'), 98, 148, 54, 54);
  osText(ctx, 'GIELINOR', 125, 70, OS.orange, 30);
  osText(ctx, 'GAMBIT', 125, 288, OS.orange, 30);
  for (const [rx, ry] of [[10, 10], [240, 10], [10, 340], [240, 340]]) rivet(ctx, rx, ry);
  return canvas;
}
