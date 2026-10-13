// Low-poly, flat-shaded models in the style of Old School RuneScape.
// Used for card portraits (rendered small, pixelated and outlined like OSRS
// inventory icons) and for the duellists sitting at the table.
import * as THREE from '../vendor/three.module.min.js';

const matCache = new Map();
export function osrsMat(color, emissive = null, opts = {}) {
  const key = `${color}|${emissive}|${opts.transparent ? 1 : 0}|${opts.opacity ?? 1}`;
  if (!opts.unique && matCache.has(key)) return matCache.get(key);
  const m = new THREE.MeshLambertMaterial({ color, flatShading: true, ...(emissive ? { emissive, emissiveIntensity: opts.ei ?? 1 } : {}), ...(opts.transparent ? { transparent: true, opacity: opts.opacity ?? 0.6, depthWrite: false } : {}) });
  if (!opts.unique) matCache.set(key, m);
  return m;
}

const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const C = (rt, rb, h, s = 7) => new THREE.CylinderGeometry(rt, rb, h, s);
const K = (r, h, s = 6) => new THREE.ConeGeometry(r, h, s);
const S = (r, d = 0) => new THREE.IcosahedronGeometry(r, d);

function add(parent, geo, color, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, emissive = null, opts) {
  const m = new THREE.Mesh(geo, typeof color === 'string' ? osrsMat(color, emissive, opts) : color);
  m.position.set(x, y, z); m.rotation.set(rx, ry, rz);
  m.castShadow = true; m.receiveShadow = true;
  parent.add(m);
  return m;
}
const grp = (parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
const darker = (c, k = 0.7) => '#' + new THREE.Color(c).multiplyScalar(k).getHexString();

// ------------------------------------------------------------------ weapons
function weapon(hand, kind, o = {}) {
  const g = grp(hand, 0, -0.04, 0.04);
  const blade = o.blade || '#b8bcc4';
  switch (kind) {
    case 'sword':
      add(g, B(0.05, 0.12, 0.05), '#5a3a1a', 0, 0, 0);
      add(g, B(0.24, 0.04, 0.06), '#c8a040', 0, 0.07, 0);
      add(g, B(0.07, 0.75, 0.02), blade, 0, 0.47, 0);
      add(g, K(0.035, 0.1, 4), blade, 0, 0.9, 0, 0, Math.PI / 4);
      g.rotation.x = 0.9; break;
    case 'scimitar':
      add(g, B(0.05, 0.12, 0.05), '#5a3a1a', 0, 0, 0);
      add(g, B(0.2, 0.04, 0.06), '#c8a040', 0, 0.07, 0);
      add(g, B(0.08, 0.35, 0.02), blade, 0, 0.26, 0, 0, 0, -0.08);
      add(g, B(0.08, 0.3, 0.02), blade, 0.04, 0.55, 0, 0, 0, -0.35);
      g.rotation.x = 0.9; break;
    case 'staff':
      add(g, C(0.03, 0.03, 1.7, 6), '#6a4424', 0, 0.35, 0);
      add(g, S(0.09, 0), o.orb || '#ff4030', 0, 1.25, 0, 0, 0, 0, o.orb || '#ff4030', { ei: 0.6 });
      break;
    case 'bow': {
      const t = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.03, 4, 10, Math.PI * 0.75), osrsMat('#7a5028'));
      t.rotation.set(0, Math.PI / 2, Math.PI * 0.62); t.position.set(0, 0.05, -0.35); g.add(t);
      add(g, B(0.01, 0.9, 0.01), '#e8e0d0', 0, 0.05, 0.06);
      break;
    }
    case 'crossbow':
      add(g, B(0.06, 0.06, 0.55), '#6a4424', 0, 0.05, 0.2);
      add(g, B(0.6, 0.05, 0.05), '#7a7a80', 0, 0.06, 0.42);
      break;
    case 'club':
      add(g, C(0.04, 0.05, 0.3, 6), '#5a3a1a', 0, 0.05, 0);
      add(g, C(0.13, 0.06, 0.6, 6), o.club || '#7a5028', 0, 0.48, 0);
      g.rotation.x = 0.7; break;
    case 'mace':
      add(g, C(0.04, 0.04, 0.7, 6), '#4a4a50', 0, 0.25, 0);
      add(g, S(0.16, 0), '#6a6a72', 0, 0.68, 0);
      for (let i = 0; i < 6; i++) add(g, K(0.05, 0.14, 4), '#9a9aa2', Math.cos(i) * 0.16, 0.68 + Math.sin(i * 2) * 0.1, Math.sin(i) * 0.16, Math.sin(i) * 1.5, 0, -Math.cos(i) * 1.5);
      g.rotation.x = 0.7; break;
    case 'spear':
      add(g, C(0.025, 0.025, 1.4, 5), '#7a5028', 0, 0.35, 0);
      add(g, K(0.06, 0.2, 4), '#a8acb4', 0, 1.12, 0);
      g.rotation.x = 0.3; break;
    default: break;
  }
  return g;
}

function kiteshield(parent, color, trim = '#c8a040') {
  const shape = new THREE.Shape();
  shape.moveTo(-0.22, 0.3); shape.lineTo(0.22, 0.3); shape.lineTo(0.2, -0.05); shape.lineTo(0, -0.42); shape.lineTo(-0.2, -0.05); shape.closePath();
  const g = grp(parent, 0.1, 0.02, 0);
  add(g, new THREE.ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: false }), color, 0, 0, 0, 0, Math.PI / 2, 0);
  add(g, B(0.06, 0.6, 0.04), trim, 0.06, -0.02, 0, 0, Math.PI / 2);
  add(g, B(0.06, 0.04, 0.34), trim, 0.06, 0.12, 0);
  return g;
}

// ------------------------------------------------------------------ humanoid
// o: { skin, top, legs, boots, hands, robe, head, hat, hair, beard, longBeard,
//      weapon, shield, cape, capeInner, wings, ears, nose, scale, plate, pose,
//      hunch, horns, tail, belt, emissive, crest }
export function humanoid(o = {}) {
  const root = new THREE.Group();
  const body = grp(root);
  const s = o.scale || 1;
  body.scale.setScalar(s);
  const skin = o.skin || '#c8946a';
  const top = o.top || '#6a6a6a';
  const legs = o.legs || '#4a3a2a';
  const boots = o.boots || '#3a2a1a';
  const hands = o.hands || skin;
  const sit = o.pose === 'sit';
  const em = o.emissive || null;

  const hips = grp(body, 0, sit ? 0.62 : 0.98, 0);
  const parts = { root, body, hips };
  // legs
  for (const side of [-1, 1]) {
    const leg = grp(hips, side * 0.12, -0.04, 0);
    const legCol = o.robe && !sit ? top : legs;
    add(leg, B(0.2, 0.46, 0.22), legCol, 0, -0.23, 0);
    const knee = grp(leg, 0, -0.46, 0);
    add(knee, B(0.19, 0.42, 0.21), legCol, 0, -0.2, 0);
    add(knee, B(0.22, 0.12, 0.32), boots, 0, -0.45, 0.05);
    if (sit) { leg.rotation.x = -Math.PI / 2; knee.rotation.x = Math.PI / 2; }
  }
  if (o.robe && !sit) add(hips, C(0.28, 0.42, 0.9, 6), top, 0, -0.42, 0);

  const torso = grp(hips, 0, 0, 0);
  parts.torso = torso;
  if (o.hunch) torso.rotation.x = o.hunch;
  add(torso, B(0.46, 0.2, 0.28), o.belt || darker(legs, 0.9), 0, 0.06, 0);
  const chest = add(torso, C(0.4, 0.31, 0.58, 4), top, 0, 0.44, 0, 0, Math.PI / 4, 0);
  chest.scale.z = 0.62;
  if (o.belt) add(torso, B(0.48, 0.07, 0.3), o.belt, 0, 0.16, 0);
  if (o.trim) add(torso, B(0.08, 0.58, 0.02), o.trim, 0, 0.44, 0.17);
  if (o.plate) for (const side of [-1, 1]) add(torso, B(0.22, 0.14, 0.3), top, side * 0.32, 0.72, 0);
  if (o.spikes) for (const side of [-1, 1]) for (let i = 0; i < 3; i++) add(torso, K(0.04, 0.16, 4), '#d8d0c0', side * (0.24 + i * 0.07), 0.84, 0);
  if (o.moss) for (let i = 0; i < 9; i++) add(torso, S(0.08 + (i % 3) * 0.02, 0), '#3f7a1f', ((i * 37) % 9 - 4) * 0.1, 0.55 + (i % 4) * 0.08, 0.12 + (i % 2) * 0.02);
  if (o.cracks) for (let i = 0; i < 4; i++) add(torso, B(0.04, 0.22, 0.02), '#ff8a10', (i - 1.5) * 0.12, 0.4 + (i % 2) * 0.1, 0.19, 0, 0, (i - 1.5) * 0.4, '#ff6a00');
  if (o.spines) for (let i = 0; i < 5; i++) add(torso, K(0.05, 0.45, 4), '#4a3a30', (i - 2) * 0.1, 0.7, -0.2, -0.6, 0, (i - 2) * 0.25);
  // cape / wings / tail behind
  if (o.cape) {
    const cape = add(torso, B(0.5, sit ? 0.7 : 1.15, 0.04), o.cape, 0, sit ? 0.35 : 0.15, -0.2, 0.08);
    if (o.capeInner) add(torso, B(0.46, sit ? 0.66 : 1.1, 0.02), o.capeInner, 0, sit ? 0.36 : 0.16, -0.17, 0.08);
    if (o.collar) for (const side of [-1, 1]) add(torso, B(0.04, 0.38, 0.22), o.capeInner || o.cape, side * 0.22, 0.88, -0.05, 0.2, 0, side * 0.35);
    void cape;
  }
  if (o.wings) for (const side of [-1, 1]) {
    const w = grp(torso, side * 0.15, 0.6, -0.18);
    w.rotation.set(-0.25, side * 0.5, side * 0.55);
    add(w, B(0.06, 0.3, 0.05), darker(o.wings, 0.8), side * 0.1, 0.25, 0);
    add(w, B(0.9, 0.04, 0.5), o.wings, side * 0.45, 0.42, -0.05, 0, 0, side * 0.35);
    for (let i = 0; i < 3; i++) add(w, B(0.5, 0.03, 0.12), darker(o.wings, 0.85), side * (0.6 + i * 0.12), 0.2 + i * 0.12, -0.2 - i * 0.05, 0, 0, side * (0.9 - i * 0.2));
  }
  if (o.tail) { const t = grp(torso, 0, 0.05, -0.15); for (let i = 0; i < 5; i++) add(t, B(0.08 - i * 0.01, 0.08, 0.2), o.tail, 0, -0.05 - i * 0.07, -0.1 - i * 0.16, 0.3); add(t, K(0.06, 0.15, 4), o.tail, 0, -0.42, -0.9, -1.4); }

  // arms
  const arms = [];
  for (const side of [-1, 1]) {
    const arm = grp(torso, side * 0.33, 0.68, 0);
    const armCol = o.sleeves || top;
    add(arm, B(0.15, 0.36, 0.16), armCol, 0, -0.16, 0);
    const fore = grp(arm, 0, -0.34, 0);
    add(fore, B(0.14, 0.32, 0.15), o.forearm || armCol, 0, -0.15, 0);
    const hand = grp(fore, 0, -0.34, 0);
    add(hand, B(0.14, 0.14, 0.15), hands, 0, 0, 0);
    arms.push({ arm, fore, hand, side });
  }
  parts.armR = arms[0]; parts.armL = arms[1];
  if (sit) {
    for (const a of arms) { a.arm.rotation.set(-0.55, 0, a.side * -0.1); a.fore.rotation.set(-1.0, 0, 0); }
  } else {
    arms[0].arm.rotation.set(-0.35, 0, -0.12); arms[0].fore.rotation.x = -0.5;
    arms[1].arm.rotation.set(-0.15, 0, 0.12); arms[1].fore.rotation.x = -0.35;
  }
  if (o.weapon) parts.weapon = weapon(arms[0].hand, o.weapon, o);
  if (o.shield) { const sh = kiteshield(arms[1].fore, o.shield, o.shieldTrim); sh.position.set(0.1, -0.15, 0); parts.shield = sh; }

  // head
  const neckY = 0.78;
  add(torso, B(0.14, 0.14, 0.14), o.head === 'fullhelm' ? top : skin, 0, neckY, 0);
  const head = grp(torso, 0, neckY + 0.2, 0.01);
  parts.head = head;
  if (o.hunch) head.rotation.x = -o.hunch * 0.8;
  const hw = o.bigHead ? 0.44 : 0.34;
  add(head, B(hw, hw * 1.08, hw), skin, 0, 0.02, 0, 0, 0, 0, em);
  add(head, B(hw * 0.8, hw * 0.3, hw * 0.9), skin, 0, -hw * 0.38, 0.01, 0, 0, 0, em); // jaw
  const fz = hw / 2 + 0.005;
  const eyeCol = o.eyes || '#151010';
  for (const side of [-1, 1]) add(head, B(0.05, 0.04, 0.02), eyeCol, side * hw * 0.24, 0.05, fz, 0, 0, 0, o.eyes ? o.eyes : null);
  add(head, B(0.05, o.nose ? 0.12 : 0.07, o.nose ? 0.14 : 0.05), o.noseCol || darker(skin, 0.9), 0, -0.02, fz + (o.nose ? 0.05 : 0.01));
  add(head, B(0.1, 0.02, 0.02), darker(skin, 0.55), 0, -0.1, fz);
  if (o.fangs) for (const side of [-1, 1]) add(head, B(0.02, 0.05, 0.02), '#ffffff', side * 0.03, -0.13, fz + 0.005);
  if (o.ears) for (const side of [-1, 1]) add(head, K(0.06, 0.22, 4), skin, side * (hw / 2 + 0.08), 0.06, 0, 0, 0, side * -1.3);
  if (o.beard) add(head, B(hw * 0.86, o.longBeard ? 0.5 : 0.2, 0.08), o.beard, 0, o.longBeard ? -0.33 : -0.17, fz);
  const hat = o.hat || '#555';
  switch (o.head) {
    case 'fullhelm':
      add(head, B(hw + 0.06, hw * 1.12 + 0.06, hw + 0.06), hat, 0, 0.03, 0);
      add(head, K((hw + 0.06) * 0.72, 0.12, 4), hat, 0, hw * 0.62 + 0.06, 0, 0, Math.PI / 4);
      add(head, B(hw * 0.75, 0.04, 0.02), '#050505', 0, 0.06, (hw + 0.06) / 2 + 0.005);
      add(head, B(0.04, 0.16, 0.02), '#050505', 0, -0.04, (hw + 0.06) / 2 + 0.005);
      break;
    case 'hat':
      add(head, C(0.34, 0.34, 0.03, 10), hat, 0, hw * 0.55, 0);
      { const c = add(head, K(0.2, 0.6, 7), hat, 0, hw * 0.55 + 0.3, -0.04, -0.2); void c; }
      if (o.hatTrim) add(head, C(0.2, 0.21, 0.06, 8), o.hatTrim, 0, hw * 0.6, 0);
      break;
    case 'partyhat':
      add(head, C(hw * 0.62, hw * 0.62, 0.06, 8), hat, 0, hw * 0.58, 0);
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; add(head, K(0.06, 0.18, 4), hat, Math.cos(a) * hw * 0.5, hw * 0.58 + 0.11, Math.sin(a) * hw * 0.5); }
      break;
    case 'hood':
      add(head, B(hw + 0.08, 0.1, hw + 0.08), hat, 0, hw * 0.58, -0.01);
      add(head, B(hw + 0.08, hw * 1.1, 0.06), hat, 0, 0.04, -hw / 2 - 0.03);
      for (const side of [-1, 1]) add(head, B(0.06, hw * 1.15, hw + 0.06), hat, side * (hw / 2 + 0.03), 0.02, 0);
      add(head, K(0.1, 0.2, 4), hat, 0, hw * 0.4, -hw * 0.6, -1.2);
      break;
    case 'hair':
      add(head, B(hw + 0.03, 0.1, hw + 0.03), o.hair || '#4a2a14', 0, hw * 0.5, 0);
      add(head, B(hw + 0.03, hw * 0.7, 0.06), o.hair || '#4a2a14', 0, 0.1, -hw / 2 - 0.01);
      break;
    case 'longhair':
      add(head, B(hw + 0.04, 0.1, hw + 0.04), o.hair, 0, hw * 0.5, 0);
      add(head, B(hw + 0.08, 0.7, 0.08), o.hair, 0, -0.12, -hw / 2 - 0.02);
      break;
    case 'vampire':
      add(head, B(hw + 0.03, 0.08, hw + 0.03), o.hair, 0, hw * 0.52, 0);
      add(head, K(0.06, 0.12, 4), o.hair, 0, hw * 0.42, fz, Math.PI);
      break;
    case 'turban':
      add(head, C(hw * 0.68, hw * 0.62, 0.2, 8), hat, 0, hw * 0.55, 0);
      add(head, S(0.06, 0), '#c82020', 0, hw * 0.55, fz + 0.04);
      break;
    case 'fedora':
      add(head, C(0.36, 0.36, 0.03, 10), hat, 0, hw * 0.55, 0);
      add(head, C(0.18, 0.21, 0.2, 8), hat, 0, hw * 0.55 + 0.1, 0);
      add(head, C(0.215, 0.215, 0.05, 8), '#2a1a0a', 0, hw * 0.55 + 0.03, 0);
      break;
    case 'gnomehat':
      add(head, K(0.2, 0.35, 6), hat, 0, hw * 0.55 + 0.15, 0);
      break;
    case 'horns':
      for (const side of [-1, 1]) { add(head, K(0.06, 0.32, 5), o.hornCol || '#e8dcc0', side * (hw / 2 + 0.08), hw * 0.52, 0, 0, 0, side * -0.7); }
      if (o.helm) add(head, B(hw + 0.05, hw * 0.5, hw + 0.05), o.helm, 0, hw * 0.32, 0);
      break;
    case 'crest':
      for (let i = 0; i < 4; i++) add(head, K(0.06, 0.3, 4), o.crestCol || darker(skin, 0.8), 0, hw * 0.55 + 0.05, 0.1 - i * 0.12, -0.6 - i * 0.2);
      break;
    case 'beak':
      add(head, K(0.09, 0.3, 4), '#e8b830', 0, -0.05, fz + 0.13, Math.PI / 2);
      for (let i = 0; i < 3; i++) add(head, K(0.05, 0.25, 4), o.crestCol || darker(skin, 0.7), (i - 1) * 0.08, hw * 0.55 + 0.08, -0.08, -0.6);
      break;
    default: break;
  }
  return parts;
}

// ------------------------------------------------------------------ creatures
function chicken() {
  const g = new THREE.Group();
  for (const side of [-1, 1]) { add(g, B(0.04, 0.3, 0.04), '#e0a020', side * 0.1, 0.15, 0); add(g, B(0.12, 0.03, 0.14), '#e0a020', side * 0.1, 0.01, 0.04); }
  add(g, B(0.5, 0.42, 0.62), '#efe9df', 0, 0.5, 0);
  add(g, B(0.3, 0.3, 0.2), '#d8d0c4', 0, 0.62, -0.38, 0.5);
  for (const side of [-1, 1]) add(g, B(0.06, 0.3, 0.4), '#d8d0c4', side * 0.27, 0.52, -0.02);
  add(g, B(0.22, 0.26, 0.24), '#f4f0e8', 0, 0.86, 0.32);
  add(g, B(0.06, 0.12, 0.18), '#d82a2a', 0, 1.04, 0.32);
  add(g, K(0.05, 0.14, 4), '#f0b020', 0, 0.84, 0.5, Math.PI / 2);
  add(g, B(0.05, 0.1, 0.04), '#d82a2a', 0, 0.74, 0.45);
  for (const side of [-1, 1]) add(g, B(0.02, 0.04, 0.02), '#111', side * 0.112, 0.9, 0.38);
  return g;
}

function cat() {
  const g = new THREE.Group();
  const fur = '#7a7a82', dark = '#4a4a52';
  add(g, B(0.4, 0.36, 0.6), fur, 0, 0.3, 0);
  for (const [x, z] of [[-0.13, 0.22], [0.13, 0.22], [-0.13, -0.22], [0.13, -0.22]]) add(g, B(0.1, 0.22, 0.1), fur, x, 0.1, z);
  add(g, B(0.34, 0.3, 0.3), fur, 0, 0.6, 0.32);
  for (const side of [-1, 1]) add(g, K(0.07, 0.15, 4), fur, side * 0.12, 0.81, 0.32, 0, Math.PI / 4);
  for (const side of [-1, 1]) add(g, B(0.06, 0.05, 0.02), '#c8d030', side * 0.08, 0.64, 0.475, 0, 0, 0, '#5a6010');
  add(g, B(0.05, 0.04, 0.03), '#e88a9a', 0, 0.56, 0.48);
  for (let i = 0; i < 3; i++) add(g, B(0.42, 0.04, 0.05), dark, 0, 0.49, 0.1 - i * 0.18);
  for (let i = 0; i < 5; i++) add(g, B(0.07, 0.07, 0.14), i % 2 ? dark : fur, 0, 0.34 + i * 0.1, -0.36 - i * 0.04, 0.6);
  return g;
}

function quadruped(o) {
  // dragons and Jad
  const g = new THREE.Group();
  const c = o.color, belly = o.belly || darker(c, 1.35);
  add(g, B(0.9, 0.7, 1.4), c, 0, 0.95, 0);
  add(g, B(0.7, 0.2, 1.2), belly, 0, 0.62, 0.02);
  for (const [x, z] of [[-0.38, 0.45], [0.38, 0.45], [-0.38, -0.45], [0.38, -0.45]]) {
    add(g, B(0.24, 0.65, 0.3), darker(c, 0.9), x, 0.35, z);
    add(g, B(0.28, 0.08, 0.38), darker(c, 0.6), x, 0.04, z + 0.06);
    for (let i = -1; i <= 1; i++) add(g, K(0.025, 0.1, 4), '#e8e0c8', x + i * 0.08, 0.04, z + 0.28, Math.PI / 2);
  }
  // tail
  for (let i = 0; i < 6; i++) add(g, B(0.3 - i * 0.04, 0.24 - i * 0.03, 0.3), c, 0, 0.9 - i * 0.08, -0.8 - i * 0.26);
  if (o.wings) for (const side of [-1, 1]) {
    const w = grp(g, side * 0.4, 1.3, 0.1);
    w.rotation.set(0.2, 0, side * -0.7);
    add(w, B(0.08, 1.1, 0.08), darker(c, 0.7), 0, 0.55, 0);
    add(w, B(0.04, 1.0, 1.2), o.membrane || darker(c, 0.75), side * 0.02, 0.55, -0.55);
    add(w, B(0.06, 0.6, 0.06), darker(c, 0.7), 0, 0.9, -0.6, 0.9);
  }
  if (o.spikes) for (let i = 0; i < 6; i++) add(g, K(0.08, 0.35, 4), o.spikeCol || darker(c, 0.6), 0, 1.4, 0.55 - i * 0.24, -0.4);
  const heads = o.heads || 1;
  const parts = [];
  for (let h = 0; h < heads; h++) {
    const off = heads === 3 ? (h - 1) * 0.42 : 0;
    const neck = grp(g, off * 0.6, 1.15, 0.6);
    neck.rotation.set(0, off * 0.9, 0);
    if (!o.noNeck) for (let i = 0; i < 4; i++) add(neck, B(0.3 - i * 0.02, 0.3, 0.26), c, 0, i * 0.2, i * 0.13, -0.6);
    const head = grp(neck, 0, o.noNeck ? 0.1 : 0.85, o.noNeck ? 0.25 : 0.55);
    add(head, B(o.headW || 0.4, o.headH || 0.34, 0.45), c, 0, 0, 0);
    add(head, B((o.headW || 0.4) * 0.7, 0.18, 0.4), c, 0, -0.06, 0.36);
    add(head, B((o.headW || 0.4) * 0.66, 0.06, 0.38), '#2a0a06', 0, -0.17, 0.36);
    for (const side of [-1, 1]) {
      add(head, B(0.08, 0.06, 0.04), o.eye || '#ff4010', side * 0.13, 0.08, 0.23, 0, 0, 0, o.eye || '#ff4010');
      add(head, K(0.05, 0.32, 4), o.horn || '#d8ccb0', side * 0.12, 0.25, -0.2, -0.9);
      add(head, K(0.03, 0.08, 4), '#ffffff', side * 0.1, -0.2, 0.5, Math.PI);
    }
    parts.push(head);
  }
  if (o.cracks) for (let i = 0; i < 8; i++) add(g, B(0.05, 0.3, 0.04), '#ff8a10', (i % 2 ? 1 : -1) * 0.455, 0.9 + (i % 3) * 0.1, -0.5 + i * 0.14, 0, 0, (i - 4) * 0.3, '#ff6a00');
  return g;
}

function serpent() {
  const g = new THREE.Group();
  const col = '#3a9a4a', light = '#7ad06a', fin = '#d84a3a';
  // coil
  for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; add(g, B(0.34, 0.3, 0.34), i % 2 ? col : darker(col, 0.85), Math.cos(a) * 0.6, 0.15, Math.sin(a) * 0.6, 0, -a); }
  // rising body (S-curve)
  const pts = [];
  for (let i = 0; i < 12; i++) { const t = i / 11; pts.push([Math.sin(t * Math.PI * 1.2) * 0.35, 0.3 + t * 1.6, 0.4 + Math.sin(t * Math.PI) * 0.2]); }
  pts.forEach(([x, y, z], i) => { add(g, B(0.32 - i * 0.008, 0.2, 0.3), i % 2 ? col : darker(col, 0.85), x, y, z); add(g, B(0.2, 0.16, 0.04), light, x, y, z + 0.16); });
  const [hx, hy, hz] = pts[pts.length - 1];
  const head = grp(g, hx, hy + 0.15, hz + 0.1);
  add(head, B(0.42, 0.24, 0.5), col, 0, 0, 0.1);
  add(head, B(0.3, 0.1, 0.25), darker(col, 0.8), 0, -0.1, 0.32);
  for (const side of [-1, 1]) {
    add(head, B(0.06, 0.05, 0.04), '#f8e020', side * 0.14, 0.08, 0.3, 0, 0, 0, '#a89000');
    add(head, B(0.04, 0.5, 0.35), fin, side * 0.32, 0.12, -0.05, 0, 0, side * -0.6);
  }
  add(head, B(0.04, 0.35, 0.4), fin, 0, 0.25, -0.1);
  return g;
}

// ------------------------------------------------------------------ items & spells
function itemModel(kind, o = {}) {
  const g = new THREE.Group();
  switch (kind) {
    case 'shark': {
      const body = add(g, C(0.22, 0.16, 1.2, 4), '#6a7a8a', 0, 0, 0, 0, Math.PI / 4, Math.PI / 2); body.scale.set(1, 1, 0.7);
      add(g, B(1.0, 0.1, 0.2), '#e8e8e0', 0, -0.13, 0);
      add(g, K(0.18, 0.35, 4), '#5a6a7a', -0.05, 0.3, 0, 0, Math.PI / 4);
      add(g, B(0.08, 0.5, 0.06), '#5a6a7a', 0.68, 0.08, 0, 0, 0, 0.5);
      add(g, B(0.08, 0.3, 0.06), '#5a6a7a', 0.66, -0.12, 0, 0, 0, -0.6);
      add(g, B(0.05, 0.05, 0.02), '#111', -0.48, 0.05, 0.12);
      for (let i = 0; i < 3; i++) add(g, B(0.04, 0.3, 0.3), '#8a4a20', -0.2 + i * 0.2, 0, 0.02); // grill marks: it's cooked
      g.rotation.set(0.2, -0.3, 0.3); break;
    }
    case 'potion':
      add(g, C(0.22, 0.24, 0.5, 8), '#c8d8e8', 0, 0, 0, 0, 0, 0, null, { transparent: true, opacity: 0.45 });
      add(g, C(0.2, 0.22, 0.34, 8), o.color, 0, -0.07, 0, 0, 0, 0, o.color, { ei: 0.25 });
      add(g, C(0.08, 0.1, 0.22, 6), '#c8d8e8', 0, 0.35, 0, 0, 0, 0, null, { transparent: true, opacity: 0.45 });
      add(g, C(0.09, 0.08, 0.12, 6), '#8a5a2a', 0, 0.5, 0);
      g.rotation.z = 0.25; break;
    case 'platebody': {
      const c = o.color;
      add(g, C(0.42, 0.33, 0.62, 4), c, 0, 0, 0, 0, Math.PI / 4).scale.z = 0.62;
      for (const side of [-1, 1]) { add(g, B(0.24, 0.16, 0.32), c, side * 0.34, 0.26, 0); add(g, B(0.15, 0.3, 0.17), darker(c, 0.85), side * 0.37, 0.05, 0); }
      add(g, B(0.2, 0.06, 0.05), darker(c, 0.6), 0, 0.28, 0.2);
      add(g, B(0.06, 0.5, 0.03), darker(c, 0.75), 0, 0, 0.19);
      g.rotation.y = 0.5; break;
    }
    case 'whip': {
      add(g, B(0.08, 0.35, 0.08), '#3a1a1a', -0.5, -0.4, 0, 0, 0, 0.5);
      for (let i = 0; i < 14; i++) { const t = i / 13; add(g, B(0.08, 0.1, 0.08), i % 3 === 0 ? '#8a3a7a' : '#5a5a6e', -0.4 + t * 1.0, -0.2 + Math.sin(t * Math.PI) * 0.75, Math.sin(t * 5) * 0.08); }
      break;
    }
    case 'dagger':
      add(g, B(0.08, 0.2, 0.06), '#3a2a1a', 0, -0.35, 0);
      add(g, B(0.3, 0.05, 0.08), '#5a5a62', 0, -0.23, 0);
      add(g, B(0.1, 0.55, 0.03), '#c82a1a', 0, 0.06, 0);
      add(g, K(0.05, 0.12, 4), '#c82a1a', 0, 0.4, 0, 0, Math.PI / 4);
      for (const [x, y] of [[0.15, 0.1], [0.12, -0.08], [0.18, 0.28]]) add(g, S(0.035, 0), '#3ae04a', x, y, 0.05, 0, 0, 0, '#1a9020');
      g.rotation.z = -0.7; break;
    case 'claws':
      add(g, B(0.5, 0.14, 0.14), '#5a5a62', 0, -0.3, 0);
      for (let i = 0; i < 3; i++) { const cg = grp(g, (i - 1) * 0.16, -0.22, 0); add(cg, B(0.06, 0.35, 0.04), '#c82a1a', 0, 0.17, 0, 0.3); add(cg, B(0.05, 0.25, 0.04), '#c82a1a', 0, 0.4, 0.12, 0.9); }
      g.rotation.z = -0.3; break;
    case 'cannon': {
      for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; add(g, B(0.06, 0.7, 0.06), '#3a3a3a', Math.cos(a) * 0.22, -0.3, Math.sin(a) * 0.22, Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35); }
      add(g, C(0.16, 0.18, 0.12, 8), '#4a4a4a', 0, 0.05, 0);
      const barrel = grp(g, 0, 0.2, 0); barrel.rotation.set(0.25, -0.5, 0);
      add(barrel, C(0.14, 0.18, 0.75, 8), '#2a2a30', 0, 0, 0.15, Math.PI / 2);
      add(barrel, C(0.17, 0.17, 0.06, 8), '#5a5a62', 0, 0, 0.5, Math.PI / 2);
      add(barrel, S(0.13, 0), '#ffa030', 0, 0, 0.62, 0, 0, 0, '#ff7010', { ei: 1 });
      break;
    }
    case 'coins':
      for (let i = 0; i < 14; i++) { const a = i * 2.4, r = (i % 5) * 0.08; add(g, C(0.14, 0.14, 0.04, 8), '#e8b828', Math.cos(a) * r, -0.3 + Math.floor(i / 5) * 0.05 + (i % 5 === 0 ? 0.05 : 0), Math.sin(a) * r, 0, 0, 0, '#5a3a00', { ei: 0.4 }); }
      for (let i = 0; i < 6; i++) add(g, C(0.14, 0.14, 0.04, 8), '#f0c838', 0.3, -0.3 + i * 0.045, 0.1, 0, 0, 0, '#5a3a00', { ei: 0.4 });
      break;
    case 'orb':
      add(g, S(0.25, 1), o.color, 0, 0, 0, 0, 0, 0, o.color, { ei: 0.9 });
      for (let i = 0; i < 10; i++) { const a = i * 0.9; add(g, B(0.06, 0.06, 0.06), '#ffffff', Math.cos(a) * (0.35 + i * 0.03), Math.sin(a * 0.7) * 0.2, Math.sin(a) * (0.35 + i * 0.03), 0, 0, 0, '#c8e8ff'); }
      break;
    case 'fireball':
      add(g, S(0.3, 1), '#ff9a20', 0, 0, 0, 0, 0, 0, '#ff6010', { ei: 1 });
      add(g, S(0.2, 1), '#fff0a0', 0.05, 0.05, 0.12, 0, 0, 0, '#ffd040', { ei: 1 });
      for (let i = 0; i < 6; i++) add(g, K(0.12 - i * 0.012, 0.5, 5), i % 2 ? '#ff5010' : '#ffb020', -0.3 - i * 0.12, (i % 3 - 1) * 0.12, 0, 0, 0, Math.PI / 2 + (i % 3 - 1) * 0.2, '#ff4000', { ei: 0.8 });
      break;
    case 'ice':
      for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; add(g, new THREE.OctahedronGeometry(0.18, 0), '#b8ecff', Math.cos(a) * 0.32, Math.sin(a * 2) * 0.1, Math.sin(a) * 0.32, a, a, 0, '#4ab0e0', { ei: 0.35 }).scale.y = 2.2; }
      add(g, new THREE.OctahedronGeometry(0.26, 0), '#e8faff', 0, 0, 0, 0, 0.4, 0, '#6ac8f0', { ei: 0.5 }).scale.y = 1.8;
      break;
    case 'teleport':
      for (let i = 0; i < 3; i++) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.35 + i * 0.12, 0.03, 4, 16), osrsMat('#8fd0ff', '#4aa0ff', { ei: 1 })); t.rotation.x = Math.PI / 2; t.position.y = -0.4 + i * 0.35; g.add(t); }
      add(g, C(0.28, 0.28, 1.2, 8), '#a8d8ff', 0, 0, 0, 0, 0, 0, '#6ab0ff', { transparent: true, opacity: 0.3 });
      { const p = humanoid({ skin: '#e8f4ff', top: '#e8f4ff', legs: '#e8f4ff', boots: '#e8f4ff', head: 'hair', hair: '#e8f4ff', emissive: '#6ab0ff' }); p.root.scale.setScalar(0.45); p.root.position.y = -0.55; g.add(p.root); }
      break;
    default: break;
  }
  return g;
}

// ------------------------------------------------------------------ card -> model
const RUNE = '#4a8eaa', RUNE_TRIM = '#2e6a82';
export const CARD_MODELS = {
  chicken: () => chicken(),
  goblin: () => humanoid({ skin: '#7aa03a', top: '#8a6a3a', legs: '#5a4a2a', ears: true, nose: true, head: 'bald', weapon: 'spear', scale: 0.8, eyes: '#c81010' }).root,
  hans: () => humanoid({ skin: '#d8a882', top: '#5a3a7a', legs: '#3a2a2a', head: 'hair', hair: '#5b3b1c' }).root,
  imp: () => humanoid({ skin: '#c8301e', top: '#c8301e', legs: '#c8301e', boots: '#8a1a10', head: 'horns', hornCol: '#2a1a12', wings: '#5a1a12', tail: '#a8281a', scale: 0.6, bigHead: true, eyes: '#ffd010' }).root,
  dark_wizard: () => humanoid({ skin: '#d0a07a', top: '#1f1a24', trim: '#9e1b1b', robe: true, head: 'hat', hat: '#1a161e', hatTrim: '#9e1b1b', beard: '#3a3a3a', weapon: 'staff', orb: '#ff3020' }).root,
  gnome_archer: () => humanoid({ skin: '#d8a882', top: '#3e7a2d', legs: '#5a3a1e', head: 'gnomehat', hat: '#2f6a2a', weapon: 'bow', scale: 0.7, bigHead: true, ears: true }).root,
  al_kharid_warrior: () => humanoid({ skin: '#a87850', top: '#e9e2cf', trim: '#a32020', legs: '#c8c0a8', head: 'turban', hat: '#efe6d0', weapon: 'scimitar' }).root,
  bob: () => cat(),
  black_knight: () => humanoid({ skin: '#c8946a', top: '#26262c', legs: '#26262c', boots: '#1a1a1e', hands: '#1a1a1e', head: 'fullhelm', hat: '#26262c', weapon: 'sword', blade: '#4a4a52', shield: '#26262c', shieldTrim: '#5a5a62', plate: true }).root,
  hill_giant: () => humanoid({ skin: '#c8946a', top: '#c8946a', legs: '#7a5730', belt: '#5a3a1a', head: 'bald', weapon: 'club', scale: 1.3, nose: true }).root,
  tok_xil: () => humanoid({ skin: '#3a2a22', top: '#3a2a22', legs: '#2a1e18', boots: '#1a1210', head: 'crest', crestCol: '#4a3a30', eyes: '#ffd020', cracks: true, spines: true, scale: 1.05 }).root,
  aviansie: () => humanoid({ skin: '#8a6a48', top: '#8a6a48', legs: '#6a5038', boots: '#e8b830', head: 'beak', crestCol: '#5a4028', wings: '#7a5a38', weapon: 'crossbow', eyes: '#111' }).root,
  wise_old_man: () => humanoid({ skin: '#e0b896', top: '#6a3a8a', robe: true, head: 'partyhat', hat: '#3b62e0', beard: '#f1f1f1', longBeard: true }).root,
  moss_giant: () => humanoid({ skin: '#9a8a6a', top: '#9a8a6a', legs: '#4f6a2a', head: 'bald', weapon: 'club', club: '#5a4020', scale: 1.35, moss: true, nose: true }).root,
  lesser_demon: () => humanoid({ skin: '#b3261e', top: '#b3261e', legs: '#a0201a', boots: '#5a100a', head: 'horns', hornCol: '#2a1a12', wings: '#5a1410', tail: '#9a1e18', scale: 1.2, hunch: 0.3, eyes: '#ffd010' }).root,
  crazy_archaeologist: () => humanoid({ skin: '#d0a07a', top: '#7a5a3a', legs: '#5a4028', head: 'fedora', hat: '#5a3d22', beard: '#9a9a9a', weapon: 'crossbow' }).root,
  count_draynor: () => humanoid({ skin: '#c8ccd8', top: '#1a1a22', legs: '#1a1a22', head: 'vampire', hair: '#121212', cape: '#141418', capeInner: '#8a1020', collar: true, fangs: true, eyes: '#c81010' }).root,
  green_dragon: () => quadruped({ color: '#3f8a2f', wings: true, membrane: '#2f6a22' }),
  ket_zek: () => humanoid({ skin: '#3a2a22', top: '#3a2a22', legs: '#2a1e18', head: 'crest', crestCol: '#5a3a30', eyes: '#ff40e0', cracks: true, scale: 1.3, weapon: 'staff', orb: '#ff40e0' }).root,
  greater_demon: () => humanoid({ skin: '#8a1d16', top: '#8a1d16', legs: '#7a1812', boots: '#3a0a06', head: 'horns', hornCol: '#1a120c', wings: '#3a0c08', tail: '#7a1812', scale: 1.4, hunch: 0.35, eyes: '#ffd010' }).root,
  zulrah: () => serpent(),
  general_graardor: () => humanoid({ skin: '#6f7c4f', top: '#5b5248', legs: '#4a4238', head: 'horns', helm: '#4a4238', weapon: 'mace', scale: 1.45, spikes: true, plate: true, nose: true }).root,
  commander_zilyana: () => humanoid({ skin: '#efd2b8', top: '#e8e8ec', trim: '#d8b23a', legs: '#d8d8e0', boots: '#d8b23a', head: 'longhair', hair: '#f0dc8a', weapon: 'sword', blade: '#e8f0ff', shield: '#e8e8ec', shieldTrim: '#d8b23a', plate: true, wings: '#ffffff' }).root,
  kreearra: () => humanoid({ skin: '#3a3346', top: '#3a3346', legs: '#2a2436', boots: '#e0b84a', head: 'beak', crestCol: '#e0b84a', wings: '#2a2436', belt: '#e0b84a', scale: 1.4, eyes: '#ff3030' }).root,
  kril: () => humanoid({ skin: '#c22a1f', top: '#c22a1f', legs: '#8a1a12', boots: '#2a0a06', head: 'horns', hornCol: '#e8dcc0', wings: '#4a0c08', tail: '#a8221a', weapon: 'mace', scale: 1.45, hunch: 0.25, eyes: '#40ff40' }).root,
  kbd: () => quadruped({ color: '#26232a', wings: true, membrane: '#1a181e', heads: 3, eye: '#ff2010', spikes: true }),
  jad: () => quadruped({ color: '#4a3020', belly: '#5a3a28', heads: 1, noNeck: true, headW: 0.7, headH: 0.55, spikes: true, spikeCol: '#6a4430', cracks: true, eye: '#ffe040', horn: '#6a4430' }),
  wind_strike: () => itemModel('orb', { color: '#e8f4ff' }),
  fire_blast: () => itemModel('fireball'),
  ice_barrage: () => itemModel('ice'),
  home_teleport: () => itemModel('teleport'),
  shark: () => itemModel('shark'),
  super_combat: () => itemModel('potion', { color: '#2f8f3a' }),
  saradomin_brew: () => itemModel('potion', { color: '#e8d27a' }),
  rune_platebody: () => itemModel('platebody', { color: RUNE }),
  dragon_dagger: () => itemModel('dagger'),
  abyssal_whip: () => itemModel('whip'),
  dragon_claws: () => itemModel('claws'),
  dwarf_multicannon: () => itemModel('cannon'),
  coins: () => itemModel('coins'),
};

// Seated duellists (player characters in OSRS gear)
export const AVATAR_MODELS = {
  knight: (pose) => humanoid({ pose, skin: '#c8946a', top: RUNE, legs: RUNE, boots: RUNE_TRIM, hands: RUNE_TRIM, head: 'fullhelm', hat: RUNE, plate: true, trim: RUNE_TRIM, belt: '#c8a040', weapon: pose === 'sit' ? null : 'scimitar', blade: '#c8303a', shield: pose === 'sit' ? null : RUNE }),
  wizard: (pose) => humanoid({ pose, skin: '#d8a882', top: '#2a46a8', legs: '#2a46a8', boots: '#1a2a6a', robe: true, head: 'hat', hat: '#2a46a8', hatTrim: '#e8c040', beard: '#ececec', longBeard: true, trim: '#e8c040', weapon: pose === 'sit' ? null : 'staff', orb: '#6ab0ff' }),
  ranger: (pose) => humanoid({ pose, skin: '#d8a882', top: '#2f6a2a', sleeves: '#3f7a32', forearm: '#5a3a1e', legs: '#4a5a2a', boots: '#4a2e16', hands: '#4a2e16', head: 'hood', hat: '#3f5f26', belt: '#4a2e16', weapon: pose === 'sit' ? null : 'bow' }),
};

// ------------------------------------------------------------------ pixel renderer
let artRenderer = null, artScene = null, artCam = null;
function setupRenderer(w, h) {
  if (!artRenderer) {
    const canvas = document.createElement('canvas');
    artRenderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, preserveDrawingBuffer: true });
    artRenderer.setPixelRatio(1);
    artRenderer.outputColorSpace = THREE.SRGBColorSpace;
    artScene = new THREE.Scene();
    artScene.add(new THREE.AmbientLight('#ffffff', 1.25));
    const sun = new THREE.DirectionalLight('#fff4e0', 2.4); sun.position.set(-2, 3, 4); artScene.add(sun);
    const rim = new THREE.DirectionalLight('#a0b8ff', 0.6); rim.position.set(3, 1, -3); artScene.add(rim);
    artCam = new THREE.PerspectiveCamera(24, 1, 0.1, 100);
  }
  artRenderer.setSize(w, h, false);
  artCam.aspect = w / h; artCam.updateProjectionMatrix();
}

// Render a model to a small transparent canvas, then add the 1px black outline
// OSRS uses on items. Returns a canvas of size w x h (low-res; scale it up with
// image smoothing off).
export function renderPixelModel(obj, w, h, { yaw = -0.5, pitch = 0.18, fill = 0.86, focus = 0, outline = '#000000', shadow = true } = {}) {
  setupRenderer(w, h);
  const holder = new THREE.Group();
  holder.add(obj);
  obj.rotation.y += yaw;
  artScene.add(holder);
  holder.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(holder);
  const size = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
  center.y += size.y * focus;
  const vfov = THREE.MathUtils.degToRad(artCam.fov);
  const fitH = size.y / (2 * Math.tan(vfov / 2));
  const fitW = Math.max(size.x, size.z) / (2 * Math.tan(vfov / 2) * artCam.aspect);
  const dist = Math.max(fitH, fitW) / fill + Math.max(size.x, size.z) / 2;
  artCam.position.set(center.x, center.y + Math.sin(pitch) * dist, center.z + Math.cos(pitch) * dist);
  artCam.lookAt(center);
  artRenderer.setClearColor(0x000000, 0);
  artRenderer.render(artScene, artCam);
  artScene.remove(holder);

  const out = document.createElement('canvas'); out.width = w; out.height = h;
  const ctx = out.getContext('2d');
  ctx.drawImage(artRenderer.domElement, 0, 0);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const solid = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    if (d[i * 4 + 3] > 40) { solid[i] = 1; d[i * 4 + 3] = 255; } else d[i * 4 + 3] = 0;
  }
  const [or, og, ob] = [1, 3, 5].map((i) => parseInt(outline.substr(i, 2), 16));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (solid[i]) continue;
    const n = (x > 0 && solid[i - 1]) || (x < w - 1 && solid[i + 1]) || (y > 0 && solid[i - w]) || (y < h - 1 && solid[i + w]);
    if (n) { d[i * 4] = or; d[i * 4 + 1] = og; d[i * 4 + 2] = ob; d[i * 4 + 3] = 255; }
    else if (shadow && x > 1 && y > 1 && solid[i - w - 1] && !solid[i]) { d[i * 4 + 3] = 90; }
  }
  ctx.putImageData(img, 0, 0);
  return out;
}

export function disposeArtRenderer() {
  if (artRenderer) { artRenderer.dispose(); artRenderer.forceContextLoss?.(); artRenderer = null; }
}
