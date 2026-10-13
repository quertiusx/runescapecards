// Procedural canvas textures for the tavern (no image files needed).
import * as THREE from '../vendor/three.module.min.js';
import { styleIcon } from './cardArt.js';

function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function tex(c, repeat = [1, 1], srgb = true) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const hsl = (h, s, l) => `hsl(${h},${s}%,${l}%)`;

export function woodPlanks({ w = 512, h = 512, planks = 6, hue = 28, light = 26, seed = 1, vertical = false } = {}) {
  const c = canvas(w, h), ctx = c.getContext('2d'), R = rng(seed);
  const ph = (vertical ? w : h) / planks;
  for (let i = 0; i < planks; i++) {
    const l = light + (R() - 0.5) * 8;
    ctx.fillStyle = hsl(hue + (R() - 0.5) * 6, 45, l);
    if (vertical) ctx.fillRect(i * ph, 0, ph, h); else ctx.fillRect(0, i * ph, w, ph);
    // grain
    for (let g = 0; g < 40; g++) {
      ctx.strokeStyle = `hsla(${hue},40%,${l - 8 + R() * 14}%,${0.25 + R() * 0.3})`;
      ctx.lineWidth = 1 + R() * 2;
      ctx.beginPath();
      const off = i * ph + R() * ph;
      for (let x = 0; x <= (vertical ? h : w); x += 16) {
        const y = off + Math.sin(x / (40 + R() * 30) + g) * 2;
        if (vertical) ctx.lineTo(y, x); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // knots
    for (let k = 0; k < 2; k++) {
      if (R() < 0.5) continue;
      const kx = R() * (vertical ? ph : w), ky = R() * (vertical ? h : ph);
      const x = vertical ? i * ph + kx : kx, y = vertical ? ky : i * ph + ky;
      ctx.fillStyle = hsl(hue, 45, l - 12); ctx.beginPath(); ctx.ellipse(x, y, 9, 5, vertical ? Math.PI / 2 : 0, 0, 7); ctx.fill();
    }
    // seams + nails
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    if (vertical) ctx.fillRect(i * ph, 0, 3, h); else ctx.fillRect(0, i * ph, w, 3);
    const seg = R() * w;
    if (!vertical) { ctx.fillRect(seg, i * ph, 3, ph); ctx.fillStyle = 'rgba(30,25,20,0.9)'; for (const nx of [seg - 10, seg + 12]) { ctx.beginPath(); ctx.arc(nx, i * ph + ph * 0.3, 2.5, 0, 7); ctx.arc(nx, i * ph + ph * 0.7, 2.5, 0, 7); ctx.fill(); } }
  }
  return c;
}

export function stoneWall({ w = 512, h = 512, seed = 3, rows = 8 } = {}) {
  const c = canvas(w, h), ctx = c.getContext('2d'), R = rng(seed);
  ctx.fillStyle = '#2b2622'; ctx.fillRect(0, 0, w, h);
  const rh = h / rows;
  for (let r = 0; r < rows; r++) {
    let x = -R() * 60;
    while (x < w) {
      const bw = 60 + R() * 70;
      const l = 30 + R() * 14;
      ctx.fillStyle = hsl(30 + R() * 15, 8 + R() * 8, l);
      const pad = 3;
      ctx.beginPath();
      ctx.roundRect(x + pad, r * rh + pad, bw - pad * 2, rh - pad * 2, 6);
      ctx.fill();
      // speckle
      for (let s = 0; s < 30; s++) { ctx.fillStyle = `rgba(${R() < 0.5 ? '0,0,0' : '255,255,255'},${R() * 0.08})`; ctx.fillRect(x + R() * bw, r * rh + R() * rh, 3, 3); }
      // top highlight / bottom shadow
      ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(x + pad, r * rh + pad, bw - pad * 2, 4);
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x + pad, r * rh + rh - pad - 5, bw - pad * 2, 5);
      x += bw;
    }
  }
  return c;
}

export function plaster({ w = 512, h = 512, seed = 5 } = {}) {
  const c = canvas(w, h), ctx = c.getContext('2d'), R = rng(seed);
  ctx.fillStyle = '#b9a789'; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 2500; i++) { ctx.fillStyle = `rgba(${R() < 0.5 ? '60,40,20' : '255,250,230'},${R() * 0.06})`; const s = 2 + R() * 10; ctx.fillRect(R() * w, R() * h, s, s); }
  for (let i = 0; i < 12; i++) { ctx.fillStyle = `rgba(80,55,30,${R() * 0.1})`; ctx.beginPath(); ctx.ellipse(R() * w, R() * h, 30 + R() * 80, 20 + R() * 50, 0, 0, 7); ctx.fill(); }
  return c;
}

export function tableMat() {
  const W = 1024, H = 1024, c = canvas(W, H), ctx = c.getContext('2d');
  // deep red cloth with gold trim
  const g = ctx.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, 700);
  g.addColorStop(0, '#4a1210'); g.addColorStop(1, '#1e0504');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const R = rng(9);
  for (let i = 0; i < 6000; i++) { ctx.fillStyle = `rgba(0,0,0,${R() * 0.12})`; ctx.fillRect(R() * W, R() * H, 2, 2); }
  ctx.strokeStyle = '#c99a3a'; ctx.lineWidth = 10; ctx.strokeRect(24, 24, W - 48, H - 48);
  ctx.lineWidth = 3; ctx.strokeRect(46, 46, W - 92, H - 92);
  // centre line
  ctx.setLineDash([18, 14]); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(201,154,58,0.6)';
  ctx.beginPath(); ctx.moveTo(60, H / 2); ctx.lineTo(W - 60, H / 2); ctx.stroke(); ctx.setLineDash([]);
  // combat triangle emblem in the centre
  const cx = W / 2, cy = H / 2, r = 70;
  ctx.fillStyle = 'rgba(20,6,4,0.75)'; ctx.beginPath(); ctx.arc(cx, cy, r + 40, 0, 7); ctx.fill();
  ctx.strokeStyle = '#c99a3a'; ctx.lineWidth = 4; ctx.stroke();
  const pts = [0, 1, 2].map((i) => { const a = -Math.PI / 2 + i * (Math.PI * 2 / 3); return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; });
  ctx.strokeStyle = '#e8c870'; ctx.lineWidth = 5;
  for (let i = 0; i < 3; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % 3];
    const mx = x0 + (x1 - x0) * 0.75, my = y0 + (y1 - y0) * 0.75;
    ctx.beginPath(); ctx.moveTo(x0 + (x1 - x0) * 0.25, y0 + (y1 - y0) * 0.25); ctx.lineTo(mx, my); ctx.stroke();
    const a = Math.atan2(y1 - y0, x1 - x0);
    ctx.fillStyle = '#e8c870'; ctx.beginPath(); ctx.moveTo(mx + Math.cos(a) * 12, my + Math.sin(a) * 12); ctx.lineTo(mx + Math.cos(a + 2.4) * 14, my + Math.sin(a + 2.4) * 14); ctx.lineTo(mx + Math.cos(a - 2.4) * 14, my + Math.sin(a - 2.4) * 14); ctx.fill();
  }
  // melee (top) beats ranged (bottom right) beats magic (bottom left) beats melee
  styleIcon(ctx, 'melee', pts[0][0], pts[0][1], 26);
  styleIcon(ctx, 'ranged', pts[1][0], pts[1][1], 26);
  styleIcon(ctx, 'magic', pts[2][0], pts[2][1], 26);
  return tex(c);
}

export function godBanner(god) {
  const W = 256, H = 512, c = canvas(W, H), ctx = c.getContext('2d');
  const cols = { saradomin: ['#1d3f9a', '#f4f4f4', '#d8b23a'], zamorak: ['#8a1010', '#141414', '#d8b23a'], guthix: ['#2f6a2a', '#e8e0c0', '#a8a8a8'], armadyl: ['#d8d0b0', '#2a6a7a', '#d8b23a'], bandos: ['#5a4a2a', '#8a7a5a', '#c8b07a'] }[god];
  ctx.fillStyle = cols[0];
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W, 0); ctx.lineTo(W, H - 60); ctx.lineTo(W / 2, H); ctx.lineTo(0, H - 60); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = cols[2]; ctx.lineWidth = 12; ctx.stroke();
  ctx.fillStyle = cols[1]; ctx.strokeStyle = cols[1]; ctx.lineWidth = 14;
  const cx = W / 2, cy = 210;
  if (god === 'saradomin') {
    ctx.beginPath(); for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 30 : 90; ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } ctx.closePath(); ctx.fill();
  } else if (god === 'zamorak') {
    ctx.beginPath(); ctx.moveTo(cx, 110); ctx.lineTo(cx, 330); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 70, 120); ctx.quadraticCurveTo(cx - 70, 200, cx, 210); ctx.quadraticCurveTo(cx + 70, 200, cx + 70, 120); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 60, 260); ctx.lineTo(cx + 60, 260); ctx.stroke();
  } else if (god === 'guthix') {
    ctx.beginPath(); ctx.arc(cx, cy, 80, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy - 80); ctx.quadraticCurveTo(cx - 50, cy, cx, cy + 80); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 45, cy - 20); ctx.lineTo(cx + 45, cy - 20); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.moveTo(cx, 120); ctx.lineTo(cx + 80, 260); ctx.lineTo(cx - 80, 260); ctx.closePath(); ctx.stroke();
  }
  return tex(c);
}

export function signBoard(lines) {
  const W = 1024, H = 320, c = canvas(W, H), ctx = c.getContext('2d');
  ctx.drawImage(woodPlanks({ w: W, h: H, planks: 3, hue: 26, light: 22, seed: 12 }), 0, 0);
  ctx.strokeStyle = '#1a0e06'; ctx.lineWidth = 16; ctx.strokeRect(8, 8, W - 16, H - 16);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 96px "Pixelify Sans", monospace';
  ctx.fillStyle = '#f0c860'; ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 8;
  ctx.fillText(lines[0], W / 2, H * 0.42);
  ctx.font = '500 44px "Pixelify Sans", monospace'; ctx.fillStyle = '#e8d8b0';
  ctx.fillText(lines[1], W / 2, H * 0.78);
  // sun emblem
  return tex(c);
}

export function flameTexture() {
  const W = 128, H = 256, c = canvas(W, H), ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(W / 2, H * 0.72, 4, W / 2, H * 0.6, H * 0.55);
  g.addColorStop(0, 'rgba(255,255,220,1)'); g.addColorStop(0.2, 'rgba(255,210,90,0.95)');
  g.addColorStop(0.5, 'rgba(255,120,20,0.6)'); g.addColorStop(1, 'rgba(120,20,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.bezierCurveTo(W * 0.9, H * 0.45, W, H * 0.8, W / 2, H); ctx.bezierCurveTo(0, H * 0.8, W * 0.1, H * 0.45, W / 2, 0); ctx.fill();
  const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}

export function glowTexture(color = '255,180,90') {
  const S = 128, c = canvas(S, S), ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, `rgba(${color},1)`); g.addColorStop(0.3, `rgba(${color},0.45)`); g.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
  const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}

export function rugTexture() {
  const W = 512, H = 512, c = canvas(W, H), ctx = c.getContext('2d');
  ctx.fillStyle = '#4a2a18'; ctx.fillRect(0, 0, W, H);
  const bands = ['#7a3a1a', '#2a3a5a', '#c89a4a', '#7a3a1a'];
  bands.forEach((b, i) => { ctx.strokeStyle = b; ctx.lineWidth = 18; ctx.strokeRect(20 + i * 30, 20 + i * 30, W - 40 - i * 60, H - 40 - i * 60); });
  ctx.fillStyle = '#6a2a14'; ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(Math.PI / 4); ctx.fillRect(-90, -90, 180, 180); ctx.restore();
  ctx.fillStyle = '#c89a4a'; ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(Math.PI / 4); ctx.fillRect(-40, -40, 80, 80); ctx.restore();
  const R = rng(4); for (let i = 0; i < 4000; i++) { ctx.fillStyle = `rgba(0,0,0,${R() * 0.15})`; ctx.fillRect(R() * W, R() * H, 2, 2); }
  return tex(c);
}

export { tex, canvas };
