// The Rising Sun Inn, Falador: environment geometry, lighting and ambience.
import * as THREE from '../vendor/three.module.min.js';
import { woodPlanks, stoneWall, plaster, tableMat, godBanner, signBoard, flameTexture, glowTexture, rugTexture, tex } from './textures.js';

const ROOM = { x0: -5.5, x1: 5.5, z0: -6, z1: 4.5, h: 4.2 };
export const TABLE_Y = 0.8;

function box(w, h, d, material, x, y, z, parent, shadow = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.castShadow = shadow; m.receiveShadow = true;
  parent.add(m);
  return m;
}
function cyl(rt, rb, h, seg, material, x, y, z, parent) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}

export function buildTavern(scene) {
  const root = new THREE.Group();
  scene.add(root);
  const flames = [];
  const flickers = [];

  // ---------------------------------------------------------- materials
  const floorTex = tex(woodPlanks({ planks: 8, hue: 26, light: 20, seed: 2 }), [5, 5]);
  const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.82 });
  const stoneTex = tex(stoneWall({ seed: 4 }), [5, 1]);
  const stoneMat = new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.92 });
  const plasterTex = tex(plaster({}), [3, 1.5]);
  const plasterMat = new THREE.MeshStandardMaterial({ map: plasterTex, roughness: 0.95 });
  const beamTex = tex(woodPlanks({ planks: 2, hue: 24, light: 13, seed: 7, vertical: true }), [1, 2]);
  const beamMat = new THREE.MeshStandardMaterial({ map: beamTex, roughness: 0.85 });
  const woodTex = tex(woodPlanks({ planks: 5, hue: 28, light: 28, seed: 8 }), [1, 1]);
  const woodMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.7 });
  const darkWood = new THREE.MeshStandardMaterial({ map: beamTex, roughness: 0.75, color: '#bfa58a' });
  const ironMat = new THREE.MeshStandardMaterial({ color: '#2a2724', metalness: 0.8, roughness: 0.5 });
  const flameTex = flameTexture();
  const glowTex = glowTexture();

  // ---------------------------------------------------------- room shell
  const W = ROOM.x1 - ROOM.x0, D = ROOM.z1 - ROOM.z0;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.position.set((ROOM.x0 + ROOM.x1) / 2, 0, (ROOM.z0 + ROOM.z1) / 2);
  floor.receiveShadow = true; root.add(floor);

  const ceilTex = tex(woodPlanks({ planks: 10, hue: 24, light: 14, seed: 11, vertical: true }), [3, 3]);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: ceilTex, roughness: 0.9 }));
  ceil.rotation.x = Math.PI / 2; ceil.position.set((ROOM.x0 + ROOM.x1) / 2, ROOM.h, (ROOM.z0 + ROOM.z1) / 2); root.add(ceil);
  for (let x = ROOM.x0 + 1; x < ROOM.x1; x += 1.8) box(0.22, 0.3, D, beamMat, x, ROOM.h - 0.15, (ROOM.z0 + ROOM.z1) / 2, root);

  const STONE_H = 1.15;
  function wall(len, cx, cz, rotY) {
    const g = new THREE.Group(); g.position.set(cx, 0, cz); g.rotation.y = rotY; root.add(g);
    const st = stoneMat.clone(); st.map = stoneTex.clone(); st.map.repeat.set(len / 2.2, 1); st.map.needsUpdate = true;
    const s = new THREE.Mesh(new THREE.PlaneGeometry(len, STONE_H), st); s.position.y = STONE_H / 2; s.receiveShadow = true; g.add(s);
    const pl = plasterMat.clone(); pl.map = plasterTex.clone(); pl.map.repeat.set(len / 3, 1); pl.map.needsUpdate = true;
    const p = new THREE.Mesh(new THREE.PlaneGeometry(len, ROOM.h - STONE_H), pl); p.position.y = STONE_H + (ROOM.h - STONE_H) / 2; p.receiveShadow = true; g.add(p);
    // timber framing
    box(len, 0.18, 0.12, beamMat, 0, STONE_H + 0.05, 0.04, g);
    box(len, 0.2, 0.12, beamMat, 0, ROOM.h - 0.1, 0.04, g);
    const n = Math.max(2, Math.round(len / 1.8));
    for (let i = 0; i <= n; i++) {
      const x = -len / 2 + (len / n) * i;
      box(0.18, ROOM.h - STONE_H, 0.12, beamMat, x, STONE_H + (ROOM.h - STONE_H) / 2, 0.04, g);
      if (i < n && i % 2 === 0) {
        const seg = len / n, hh = ROOM.h - STONE_H - 0.3;
        const brace = box(0.12, Math.hypot(seg, hh) * 0.98, 0.08, beamMat, x + seg / 2, STONE_H + 0.15 + hh / 2, 0.03, g);
        brace.rotation.z = Math.atan2(seg, hh) * (i % 4 === 0 ? 1 : -1);
      }
    }
    return g;
  }
  const back = wall(W, 0, ROOM.z0, 0);
  wall(W, 0, ROOM.z1, Math.PI);
  const left = wall(D, ROOM.x0, (ROOM.z0 + ROOM.z1) / 2, Math.PI / 2);
  const right = wall(D, ROOM.x1, (ROOM.z0 + ROOM.z1) / 2, -Math.PI / 2);
  void back; void left; void right;

  // ---------------------------------------------------------- lights
  scene.add(new THREE.HemisphereLight('#ffcf9a', '#2a1a10', 0.25));
  const amb = new THREE.AmbientLight('#3a2a1e', 0.35); scene.add(amb);

  // pool of warm light over the duel table (Liar's Bar style)
  const spot = new THREE.SpotLight('#ffc27a', 16, 9, Math.PI / 4.5, 0.6, 1.6);
  spot.position.set(0, 3.2, 0.1); spot.target.position.set(0, TABLE_Y, 0);
  spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024); spot.shadow.bias = -0.0004; spot.shadow.radius = 4;
  scene.add(spot, spot.target);
  flickers.push({ light: spot, base: 16, amt: 0.04, speed: 3 });

  function flame(x, y, z, s = 1, parent = root, light = null) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, color: '#ffd8a0' }));
    sp.position.set(x, y, z); sp.scale.set(0.06 * s, 0.12 * s, 1); parent.add(sp);
    const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.55 }));
    gl.position.set(x, y, z); gl.scale.set(0.5 * s, 0.5 * s, 1); parent.add(gl);
    flames.push({ sp, gl, s, seed: Math.random() * 100 });
    if (light) flickers.push(light);
    return sp;
  }

  // ---------------------------------------------------------- fireplace (left wall)
  const fx = ROOM.x0 + 0.35, fz = -1.2;
  const fpStone = stoneMat.clone(); fpStone.map = stoneTex.clone(); fpStone.map.repeat.set(1, 1); fpStone.map.needsUpdate = true;
  box(0.7, 1.5, 0.45, fpStone, fx, 0.75, fz - 0.85, root);
  box(0.7, 1.5, 0.45, fpStone, fx, 0.75, fz + 0.85, root);
  box(0.7, 0.45, 2.15, fpStone, fx, 1.27, fz, root);
  box(0.9, 0.12, 2.4, darkWood, fx + 0.08, 1.55, fz, root); // mantel
  box(0.6, ROOM.h - 1.6, 1.8, fpStone, fx - 0.05, 1.6 + (ROOM.h - 1.6) / 2, fz, root);
  box(0.2, 1.05, 1.25, new THREE.MeshStandardMaterial({ color: '#0b0705', roughness: 1 }), ROOM.x0 + 0.08, 0.52, fz, root);
  box(0.8, 0.08, 2.4, fpStone, fx + 0.1, 0.04, fz, root); // hearth
  const logMat = new THREE.MeshStandardMaterial({ color: '#3a2412', roughness: 1, emissive: '#ff4a10', emissiveIntensity: 0.25 });
  for (let i = 0; i < 4; i++) { const l = cyl(0.07, 0.07, 0.8, 8, logMat, fx - 0.05, 0.14 + (i > 1 ? 0.1 : 0), fz + (i % 2 ? 0.12 : -0.12) * (i > 1 ? 0.5 : 1), root); l.rotation.set(0, i * 0.3, Math.PI / 2); l.rotation.x = Math.PI / 2 + (i - 1.5) * 0.25; }
  const fireLight = new THREE.PointLight('#ff7a2a', 22, 11, 1.7);
  fireLight.position.set(fx + 0.4, 0.6, fz); scene.add(fireLight);
  for (let i = 0; i < 7; i++) flame(fx - 0.02 + (Math.random() - 0.5) * 0.12, 0.38 + Math.random() * 0.1, fz + (i - 3) * 0.12, 3 + Math.random() * 1.6);
  flickers.push({ light: fireLight, base: 22, amt: 0.3, speed: 9 });
  // mantel props
  for (let i = 0; i < 3; i++) cyl(0.035, 0.03, 0.12, 10, new THREE.MeshStandardMaterial({ color: ['#2a5a8a', '#6a2a2a', '#3a6a3a'][i], roughness: 0.2, metalness: 0.1 }), fx + 0.1, 1.67, fz - 0.6 + i * 0.25, root);
  cyl(0.02, 0.02, 0.18, 8, new THREE.MeshStandardMaterial({ color: '#efe6d0', roughness: 0.6 }), fx + 0.15, 1.7, fz + 0.75, root);
  flame(fx + 0.15, 1.83, fz + 0.75, 0.8);

  // Bob the cat asleep by the fire
  const catMat = new THREE.MeshStandardMaterial({ color: '#77777f', roughness: 0.95 });
  const cat = new THREE.Group(); cat.position.set(fx + 0.9, 0, fz + 0.3); root.add(cat);
  const cb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), catMat); cb.scale.set(1.3, 0.6, 1); cb.position.y = 0.1; cb.castShadow = true; cat.add(cb);
  const ch = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), catMat); ch.position.set(0.18, 0.1, 0.06); cat.add(ch);
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.06, 4), catMat); e.position.set(0.2, 0.18, 0.06 + s * 0.04); cat.add(e); }
  const tail = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.025, 6, 12, Math.PI), catMat); tail.rotation.x = Math.PI / 2; tail.position.set(-0.05, 0.04, 0.05); cat.add(tail);
  const cushion = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 16), new THREE.MeshStandardMaterial({ color: '#6a1a1a', roughness: 1 })); cushion.position.y = 0.025; cushion.receiveShadow = true; cat.add(cushion);

  // ---------------------------------------------------------- window (right wall)
  const wz = -1.4;
  const winMat = new THREE.MeshStandardMaterial({ color: '#0a1530', emissive: '#4a6aa8', emissiveIntensity: 0.9, roughness: 0.2 });
  const win = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.4), winMat); win.position.set(ROOM.x1 - 0.02, 2.3, wz); win.rotation.y = -Math.PI / 2; root.add(win);
  box(0.12, 1.6, 0.12, beamMat, ROOM.x1 - 0.05, 2.3, wz - 0.6, root); box(0.12, 1.6, 0.12, beamMat, ROOM.x1 - 0.05, 2.3, wz + 0.6, root);
  box(0.12, 0.12, 1.3, beamMat, ROOM.x1 - 0.05, 3.05, wz, root); box(0.22, 0.12, 1.4, beamMat, ROOM.x1 - 0.1, 1.55, wz, root);
  box(0.06, 1.4, 0.05, ironMat, ROOM.x1 - 0.04, 2.3, wz, root); box(0.06, 0.05, 1.1, ironMat, ROOM.x1 - 0.04, 2.3, wz, root);
  const moon = new THREE.SpotLight('#7a9ad8', 12, 10, Math.PI / 5, 0.7, 1.5);
  moon.position.set(ROOM.x1 + 0.5, 3.2, wz); moon.target.position.set(1.5, 0, wz + 0.6); scene.add(moon, moon.target);

  // ---------------------------------------------------------- torches
  function torch(x, y, z, rotY) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rotY; root.add(g);
    box(0.08, 0.16, 0.04, ironMat, 0, 0, 0.02, g, false);
    const stick = cyl(0.025, 0.018, 0.35, 8, darkWood, 0, 0.1, 0.12, g); stick.rotation.x = 0.4;
    const light = new THREE.PointLight('#ff9a4a', 6, 6, 1.8);
    light.position.set(0, 0.38, 0.25); g.add(light);
    flame(0, 0.36, 0.2, 2.2, g, { light, base: 6, amt: 0.25, speed: 11 });
  }
  torch(ROOM.x1 - 0.02, 2.1, 1.4, -Math.PI / 2);
  torch(-2.6, 2.1, ROOM.z0 + 0.02, 0);
  torch(2.6, 2.1, ROOM.z0 + 0.02, 0);
  torch(ROOM.x0 + 0.02, 2.1, 2.2, Math.PI / 2);

  // ---------------------------------------------------------- banners & sign
  function banner(god, x, y, z, rotY) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 1.5), new THREE.MeshStandardMaterial({ map: godBanner(god), roughness: 0.9, side: THREE.DoubleSide, transparent: true, alphaTest: 0.5 }));
    m.position.set(x, y, z); m.rotation.y = rotY; root.add(m);
    const rod = cyl(0.02, 0.02, 0.95, 8, ironMat, x, y + 0.78, z, root); rod.rotation.z = Math.PI / 2; rod.rotation.y = rotY;
  }
  banner('saradomin', -1.3, 2.75, ROOM.z0 + 0.12, 0);
  banner('zamorak', 1.3, 2.75, ROOM.z0 + 0.12, 0);
  banner('guthix', ROOM.x1 - 0.12, 2.7, 1.0 + 1.6, -Math.PI / 2);
  banner('armadyl', ROOM.x0 + 0.12, 2.7, 1.3, Math.PI / 2);
  banner('bandos', ROOM.x0 + 0.12, 2.7, -3.6, Math.PI / 2);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.75), new THREE.MeshStandardMaterial({ map: signBoard(['The Rising Sun', 'Falador · Est. Year 169 of the Fifth Age']), roughness: 0.8 }));
  sign.position.set(0, 3.55, ROOM.z0 + 0.1); root.add(sign);

  // ---------------------------------------------------------- bar counter (back wall)
  const barZ = ROOM.z0 + 1.4;
  box(4.6, 1.05, 0.55, woodMat, 0, 0.525, barZ, root);
  box(4.8, 0.08, 0.7, darkWood, 0, 1.08, barZ, root);
  for (let i = -2; i <= 2; i++) box(0.08, 1.0, 0.06, beamMat, i * 1.1, 0.5, barZ + 0.29, root);
  // back shelves with bottles
  const glassCols = ['#2a6a3a', '#6a2a1a', '#2a3a7a', '#8a6a1a', '#4a1a4a', '#1a5a5a'];
  for (let s = 0; s < 3; s++) {
    box(4.2, 0.05, 0.3, darkWood, 0, 1.3 + s * 0.5, ROOM.z0 + 0.17, root);
    for (let i = 0; i < 14; i++) {
      const h = 0.18 + Math.random() * 0.12;
      const bm = new THREE.MeshStandardMaterial({ color: glassCols[(i + s) % glassCols.length], roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.85 });
      cyl(0.04, 0.045, h, 10, bm, -1.95 + i * 0.3 + Math.random() * 0.05, 1.33 + s * 0.5 + h / 2, ROOM.z0 + 0.17, root);
    }
  }
  // kegs on the bar
  for (const x of [-1.9, 1.9]) {
    const k = cyl(0.25, 0.25, 0.5, 16, woodMat, x, 1.4, ROOM.z0 + 0.6, root); k.rotation.z = Math.PI / 2;
    for (const o of [-0.17, 0.17]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.255, 0.015, 6, 20), ironMat); r.position.set(x + o, 1.4, ROOM.z0 + 0.6); r.rotation.y = Math.PI / 2; root.add(r); }
    box(0.04, 0.12, 0.04, ironMat, x + 0.27, 1.34, ROOM.z0 + 0.6, root);
  }
  // mugs on the bar
  const mugMat = new THREE.MeshStandardMaterial({ color: '#8a8478', metalness: 0.6, roughness: 0.4 });
  function mug(x, y, z, parent = root) {
    const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
    cyl(0.045, 0.04, 0.13, 12, mugMat, 0, 0.065, 0, g);
    const foam = cyl(0.043, 0.043, 0.015, 12, new THREE.MeshStandardMaterial({ color: '#f0e6c8', roughness: 1 }), 0, 0.128, 0, g); foam.castShadow = false;
    const h = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.01, 6, 12, Math.PI), mugMat); h.position.set(0.05, 0.065, 0); h.rotation.z = -Math.PI / 2; g.add(h);
    return g;
  }
  for (let i = 0; i < 5; i++) mug(-1.2 + i * 0.55 + Math.random() * 0.1, 1.12, barZ + (Math.random() - 0.5) * 0.2);
  // bartender
  const bt = new THREE.Group(); bt.position.set(0.6, 0, ROOM.z0 + 0.75); root.add(bt);
  const skin = new THREE.MeshStandardMaterial({ color: '#d8a882', roughness: 0.6 });
  const shirt = new THREE.MeshStandardMaterial({ color: '#7a3a2a', roughness: 0.9 });
  const apron = new THREE.MeshStandardMaterial({ color: '#d8d0b8', roughness: 1 });
  cyl(0.2, 0.24, 0.8, 12, shirt, 0, 1.15, 0, bt);
  cyl(0.205, 0.245, 0.55, 12, apron, 0, 1.0, 0.02, bt).scale.set(1, 1, 1.02);
  const bhead = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), skin); bhead.position.set(0, 1.7, 0); bhead.castShadow = true; bt.add(bhead);
  const bhair = new THREE.Mesh(new THREE.SphereGeometry(0.135, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2.2), new THREE.MeshStandardMaterial({ color: '#3a2a1a' })); bhair.position.copy(bhead.position).add(new THREE.Vector3(0, 0.02, -0.01)); bt.add(bhair);
  const stache = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.025, 0.03), new THREE.MeshStandardMaterial({ color: '#3a2a1a' })); stache.position.set(0, 1.66, 0.12); bt.add(stache);
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), new THREE.MeshStandardMaterial({ color: '#111' })); e.position.set(s * 0.045, 1.73, 0.115); bt.add(e); }
  for (const s of [-1, 1]) { const a = cyl(0.05, 0.045, 0.5, 8, shirt, s * 0.26, 1.2, 0.12, bt); a.rotation.x = -0.9; }
  const btMug = mug(0, 0, 0, bt); btMug.position.set(0.2, 1.32, 0.3);

  // ---------------------------------------------------------- the duel table
  const tableTopMat = new THREE.MeshStandardMaterial({ map: tex(woodPlanks({ planks: 6, hue: 26, light: 24, seed: 21 })), roughness: 0.55 });
  const tw = 2.2, td = 1.85;
  box(tw, 0.09, td, tableTopMat, 0, TABLE_Y - 0.045, 0, root);
  box(tw + 0.08, 0.05, td + 0.08, darkWood, 0, TABLE_Y - 0.11, 0, root);
  for (const x of [-tw / 2 + 0.15, tw / 2 - 0.15]) for (const z of [-td / 2 + 0.15, td / 2 - 0.15]) box(0.12, TABLE_Y - 0.1, 0.12, darkWood, x, (TABLE_Y - 0.1) / 2, z, root);
  const mat = new THREE.Mesh(new THREE.PlaneGeometry(1.85, 1.5), new THREE.MeshStandardMaterial({ map: tableMat(), roughness: 0.95 }));
  mat.rotation.x = -Math.PI / 2; mat.position.set(0, TABLE_Y + 0.002, 0); mat.receiveShadow = true; root.add(mat);
  // candles on the table
  const wax = new THREE.MeshStandardMaterial({ color: '#efe4c8', roughness: 0.6, emissive: '#ff9a40', emissiveIntensity: 0.08 });
  for (const [x, z] of [[-1.0, -0.82], [1.0, -0.82]]) {
    cyl(0.07, 0.08, 0.03, 12, ironMat, x, TABLE_Y + 0.015, z, root);
    cyl(0.03, 0.032, 0.18, 10, wax, x, TABLE_Y + 0.12, z, root);
    flame(x, TABLE_Y + 0.25, z, 0.9);
  }
  const candleLight = new THREE.PointLight('#ffae5a', 2.5, 3, 2); candleLight.position.set(0, TABLE_Y + 0.4, -0.85); scene.add(candleLight);
  flickers.push({ light: candleLight, base: 2.5, amt: 0.2, speed: 13 });
  // ale & a little coin stack near each player
  mug(-1.0, TABLE_Y, 0.78); mug(0.95, TABLE_Y, -0.72);
  const coinMat = new THREE.MeshStandardMaterial({ color: '#e0b030', metalness: 0.9, roughness: 0.3 });
  for (let i = 0; i < 7; i++) cyl(0.025, 0.025, 0.006, 12, coinMat, 1.0 + (i > 4 ? 0.06 : 0), TABLE_Y + 0.003 + (i % 5) * 0.006, 0.8, root);
  // rug under the table
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.4), new THREE.MeshStandardMaterial({ map: rugTexture(), roughness: 1 }));
  rug.rotation.x = -Math.PI / 2; rug.position.y = 0.005; rug.receiveShadow = true; root.add(rug);

  // chandelier
  const ch2 = new THREE.Group(); ch2.position.set(0, 3.15, 0); root.add(ch2);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.04, 8, 32), ironMat); ring.rotation.x = Math.PI / 2; ring.castShadow = false; ch2.add(ring);
  for (let i = 0; i < 3; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1.1, 4), ironMat); c.position.set(Math.cos(i * 2.1) * 0.27, 0.5, Math.sin(i * 2.1) * 0.27); c.rotation.z = Math.cos(i * 2.1) * 0.5; c.rotation.x = -Math.sin(i * 2.1) * 0.5; ch2.add(c); }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const x = Math.cos(a) * 0.55, z = Math.sin(a) * 0.55;
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.024, 0.12, 8), wax); c.position.set(x, 0.07, z); ch2.add(c);
    flame(x, 0.17, z, 0.8, ch2);
  }

  // ---------------------------------------------------------- other furniture
  function stool(x, z) { const g = new THREE.Group(); g.position.set(x, 0, z); root.add(g); cyl(0.2, 0.2, 0.05, 14, woodMat, 0, 0.5, 0, g); for (let i = 0; i < 3; i++) { const l = cyl(0.025, 0.03, 0.5, 6, darkWood, Math.cos(i * 2.1) * 0.13, 0.25, Math.sin(i * 2.1) * 0.13, g); l.rotation.z = Math.cos(i * 2.1) * 0.12; l.rotation.x = -Math.sin(i * 2.1) * 0.12; } }
  function roundTable(x, z) {
    const g = new THREE.Group(); g.position.set(x, 0, z); root.add(g);
    cyl(0.6, 0.6, 0.06, 20, woodMat, 0, 0.75, 0, g); cyl(0.07, 0.1, 0.72, 10, darkWood, 0, 0.37, 0, g); cyl(0.3, 0.35, 0.05, 14, darkWood, 0, 0.03, 0, g);
    mug(x + 0.15, 0.78, z - 0.1); mug(x - 0.2, 0.78, z + 0.15);
    for (let i = 0; i < 3; i++) stool(x + Math.cos(i * 2.1 + 0.5) * 0.9, z + Math.sin(i * 2.1 + 0.5) * 0.9);
  }
  roundTable(3.4, 2.5); roundTable(-3.2, 3.1); roundTable(3.6, -3.0);
  function barrel(x, z, y = 0, lying = false) {
    const g = new THREE.Group(); g.position.set(x, y, z); root.add(g);
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.8, 16), woodMat); b.castShadow = b.receiveShadow = true;
    const mid = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 10), woodMat); mid.scale.set(1, 1.15, 1); mid.castShadow = true; g.add(mid);
    g.add(b);
    for (const o of [-0.25, 0.25]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.315, 0.018, 6, 20), ironMat); r.rotation.x = Math.PI / 2; r.position.y = o; g.add(r); }
    if (lying) { g.rotation.z = Math.PI / 2; g.position.y = y + 0.34; } else g.position.y = y + 0.4;
  }
  barrel(-4.8, -5.2); barrel(-4.1, -5.3); barrel(-4.45, -4.6); barrel(-4.5, -5.0, 0.78);
  barrel(4.8, 3.8); barrel(4.8, 3.1, 0, true);
  for (const [x, z, s] of [[4.6, -5.1, 0.6], [4.0, -5.3, 0.5], [4.5, -5.1, 0.45]]) { const c = box(s, s, s, woodMat, x, s / 2 + (s < 0.5 ? 0.6 : 0), z, root); c.rotation.y = x * 0.7; }
  // door on the wall behind the player
  box(1.2, 2.2, 0.08, darkWood, -2.6, 1.1, ROOM.z1 - 0.05, root);
  const ringHandle = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 6, 14), ironMat); ringHandle.position.set(-2.15, 1.05, ROOM.z1 - 0.1); root.add(ringHandle);
  // player chair (yours)
  // weapons rack on the wall behind the player
  for (let i = 0; i < 3; i++) { const sw = box(0.06, 1.0, 0.02, new THREE.MeshStandardMaterial({ color: '#b8bcc4', metalness: 0.9, roughness: 0.3 }), 1.6 + i * 0.35, 2.2, ROOM.z1 - 0.08, root); sw.rotation.z = (i - 1) * 0.2; }
  box(1.4, 0.08, 0.12, darkWood, 1.95, 1.75, ROOM.z1 - 0.08, root);

  // ---------------------------------------------------------- dust in the light
  const N = 260;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 3; pos[i * 3 + 1] = 0.9 + Math.random() * 2.3; pos[i * 3 + 2] = (Math.random() - 0.5) * 3; }
  const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ size: 0.012, map: glowTex, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, color: '#ffd8a0' }));
  root.add(dust);

  scene.fog = new THREE.FogExp2('#140c07', 0.045);
  scene.background = new THREE.Color('#0a0604');

  function update(dt, t) {
    for (const f of flames) {
      const n = Math.sin(t * 13 + f.seed) * 0.5 + Math.sin(t * 23 + f.seed * 2) * 0.3 + Math.sin(t * 7 + f.seed) * 0.2;
      f.sp.scale.set(0.06 * f.s * (1 + n * 0.08), 0.12 * f.s * (1 + n * 0.15), 1);
      f.gl.material.opacity = 0.45 + n * 0.08;
    }
    for (const fl of flickers) {
      const n = Math.sin(t * fl.speed) * 0.5 + Math.sin(t * fl.speed * 1.73 + 1) * 0.35 + Math.sin(t * fl.speed * 3.1 + 2) * 0.15;
      fl.light.intensity = fl.base * (1 + n * fl.amt);
    }
    const p = dustGeo.attributes.position.array;
    for (let i = 0; i < N; i++) {
      p[i * 3 + 1] += Math.sin(t * 0.3 + i) * 0.0006 + 0.0002;
      p[i * 3] += Math.cos(t * 0.2 + i * 1.3) * 0.0005;
      if (p[i * 3 + 1] > 3.2) p[i * 3 + 1] = 0.9;
    }
    dustGeo.attributes.position.needsUpdate = true;
    tail.rotation.z = Math.sin(t * 0.8) * 0.15;
    cb.scale.y = 0.6 + Math.sin(t * 1.4) * 0.02;
    bt.rotation.y = Math.sin(t * 0.25) * 0.4;
    bhead.rotation.y = Math.sin(t * 0.4) * 0.3;
  }

  return { update, woodMat, darkWood };
}
