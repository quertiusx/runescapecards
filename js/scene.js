// 3D duel scene: camera/look-around, table board, hand, raycast input and effects.
import * as THREE from '../vendor/three.module.min.js';
import { buildTavern, TABLE_Y } from './tavern.js';
import { Avatar, buildChair } from './avatar.js';
import { CARDS } from './cards.js';
import { drawCard, drawToken, drawCardBack, tokenKey } from './cardArt.js';
import { canPlay, spellTargets, attackTargets, canUnitAttack, needsTarget, sameTarget, attackMultiplier } from './game.js';
import { glowTexture, canvas as mkCanvas } from './textures.js';
import { sfx } from './audio.js';

const TOKEN_W = 0.25, TOKEN_H = 0.32;
const HAND_W = 0.1, HAND_H = 0.14;
const SLOT_DX = 0.31, SLOT_Z = 0.3;
const BASE_PITCH = -0.44;
const CAM_POS = new THREE.Vector3(0, 1.52, 1.32);

const ease = {
  out: (t) => 1 - Math.pow(1 - t, 3),
  inOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  back: (t) => { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function frameGlowTexture() {
  const c = mkCanvas(256, 320), ctx = c.getContext('2d');
  ctx.shadowColor = '#fff'; ctx.shadowBlur = 24; ctx.strokeStyle = '#fff'; ctx.lineWidth = 14;
  ctx.beginPath(); ctx.roundRect(28, 28, 200, 264, 22); ctx.stroke(); ctx.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

const SPELL_COLOR = { wind_strike: '#dff2ff', fire_blast: '#ff7a20', ice_barrage: '#8fdcff', home_teleport: '#6ab0ff', dragon_claws: '#ff3a2a', dwarf_multicannon: '#c0c0c0', shark: '#7dff7a', saradomin_brew: '#ffe88a', coins: '#ffd040' };

export class DuelScene {
  constructor(container, overlay, cb) {
    this.container = container; this.overlay = overlay; this.cb = cb;
    this.view = null;
    this.units = new Map(); // uid -> token record
    this.handMeshes = new Map(); // uid -> mesh
    this.anims = [];
    this.selection = null; // {kind:'card', uid} | {kind:'attack', slot}
    this.hover = null;
    this.camBase = CAM_POS.clone(); this.basePitch = BASE_PITCH;
    this.look = { yaw: 0, pitch: BASE_PITCH, ty: 0, tp: BASE_PITCH };
    this.shake = 0;
    this.busy = false;
    this.inputLocked = false;

    const r = this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.mobile = matchMedia('(pointer: coarse)').matches || Math.min(window.innerWidth, window.innerHeight) < 600;
    r.setPixelRatio(Math.min(window.devicePixelRatio, this.mobile ? 1.5 : 2));
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 0.95;
    r.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(r.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.05, 60);
    this.camera.rotation.order = 'YXZ';
    this.camera.position.copy(CAM_POS);
    this.scene.add(this.camera);

    this.tavern = buildTavern(this.scene);
    this.scene.traverse((o) => { if (o.isMesh && o.material && 'flatShading' in o.material) { o.material.flatShading = true; o.material.needsUpdate = true; } });
    // reflections for metal armour/coins: capture the tavern itself as an environment map
    const pmrem = new THREE.PMREMGenerator(r);
    const envScene = this.scene;
    const oldFog = envScene.fog; envScene.fog = null;
    envScene.position.set(0, -1.6, -0.5); envScene.updateMatrixWorld(true); // capture from above the table
    this.scene.environment = pmrem.fromScene(envScene, 0.03, 0.1, 30).texture;
    envScene.position.set(0, 0, 0); envScene.updateMatrixWorld(true);
    envScene.fog = oldFog;
    this.scene.environmentIntensity = 0.35;
    const backCanvas = drawCardBack(document.createElement('canvas'));
    this.backTex = new THREE.CanvasTexture(backCanvas); this.backTex.colorSpace = THREE.SRGBColorSpace; this.backTex.anisotropy = 8;
    this.glowFrameTex = frameGlowTexture();
    this.glowTex = glowTexture('255,255,255');

    // your chair (you sit at +Z, facing -Z)
    const myChair = buildChair(this.tavern.darkWood); myChair.position.set(0, 0, 1.3); myChair.rotation.y = Math.PI; this.scene.add(myChair);

    this.handGroup = new THREE.Group(); this.camera.add(this.handGroup);
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2(-10, -10);

    this.buildBoard();
    this.bindInput();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.clock = new THREE.Clock();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  // ------------------------------------------------------------ setup
  setPlayers(myAvatar, oppAvatar) {
    if (this.opp) this.scene.remove(this.opp.group);
    this.opp = new Avatar(oppAvatar, this.backTex, this.tavern.darkWood);
    this.opp.group.position.set(0, 0, -1.3);
    this.scene.add(this.opp.group);
    // invisible hitbox for targeting the opponent
    if (!this.oppHit) {
      this.oppHit = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.2, 12), new THREE.MeshBasicMaterial({ visible: false }));
      this.oppHit.position.set(0, 1.25, -1.3); this.oppHit.userData = { kind: 'hero' };
      this.scene.add(this.oppHit);
      this.oppRing = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.5, 40), new THREE.MeshBasicMaterial({ color: '#ff3a2a', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      this.oppRing.position.set(0, 1.3, -1.0); this.scene.add(this.oppRing);
    }
    this.clearBoard();
  }

  buildBoard() {
    this.slots = [];
    const geo = new THREE.PlaneGeometry(TOKEN_W * 1.06, TOKEN_H * 1.06);
    for (const side of ['me', 'opp']) for (let i = 0; i < 5; i++) {
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: this.glowFrameTex, color: '#ffd780', transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending }));
      m.rotation.x = -Math.PI / 2;
      m.position.copy(this.slotPos(side, i)); m.position.y = TABLE_Y + 0.004;
      m.userData = { kind: 'slot', side, slot: i };
      this.scene.add(m); this.slots.push(m);
    }
    // table plane for untargeted casts
    this.tablePlane = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.5), new THREE.MeshBasicMaterial({ visible: false }));
    this.tablePlane.rotation.x = -Math.PI / 2; this.tablePlane.position.y = TABLE_Y + 0.003; this.tablePlane.userData = { kind: 'table' };
    this.scene.add(this.tablePlane);
    // rune stones
    this.runes = { me: [], opp: [] };
    const runeGeo = new THREE.CylinderGeometry(0.022, 0.026, 0.018, 6);
    for (const side of ['me', 'opp']) for (let i = 0; i < 10; i++) {
      const m = new THREE.Mesh(runeGeo, new THREE.MeshStandardMaterial({ color: '#3a3a44', roughness: 0.4, metalness: 0.3, emissive: '#2a80ff', emissiveIntensity: 0 }));
      const sgn = side === 'me' ? 1 : -1;
      m.position.set(sgn * (0.6 + (i % 5) * 0.058), TABLE_Y + 0.01, sgn * (0.62 + Math.floor(i / 5) * 0.06));
      m.castShadow = true; m.visible = false; this.scene.add(m); this.runes[side].push(m);
    }
    // deck piles
    this.decks = {};
    for (const side of ['me', 'opp']) {
      const sgn = side === 'me' ? 1 : -1;
      const mats = [0, 0, 0, 0, 0, 0].map(() => new THREE.MeshStandardMaterial({ color: '#d8ccb0', roughness: 0.9 }));
      mats[2] = new THREE.MeshStandardMaterial({ map: this.backTex, roughness: 0.6 });
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1, 0.21), mats);
      m.position.set(sgn * 0.98, TABLE_Y, sgn * 0.18); m.castShadow = true; m.receiveShadow = true;
      m.visible = false;
      this.scene.add(m); this.decks[side] = m;
    }
  }

  slotPos(side, i) {
    return side === 'me' ? new THREE.Vector3((i - 2) * SLOT_DX, TABLE_Y + 0.012, SLOT_Z) : new THREE.Vector3((2 - i) * SLOT_DX, TABLE_Y + 0.012, -SLOT_Z);
  }
  sideOf(p) { return this.view && p === this.view.me ? 'me' : 'opp'; }

  clearBoard() {
    for (const u of this.units.values()) this.scene.remove(u.group);
    this.units.clear();
    for (const m of this.handMeshes.values()) this.handGroup.remove(m);
    this.handMeshes.clear();
    for (const d of Object.values(this.decks || {})) d.visible = false;
    for (const side of Object.values(this.runes || {})) side.forEach((m) => (m.visible = false));
    if (this.opp) this.opp.setCardCount(0);
    this.selection = null;
  }

  // ------------------------------------------------------------ tokens
  makeToken(u) {
    const group = new THREE.Group();
    const canvas = document.createElement('canvas');
    drawToken(canvas, u);
    const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const edge = new THREE.MeshStandardMaterial({ color: '#2a1a10', roughness: 0.8 });
    const face = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, transparent: true });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(TOKEN_W, 0.006, TOKEN_H), [edge, edge, face, edge, edge, edge]);
    mesh.castShadow = true; mesh.receiveShadow = true;
    group.add(mesh);
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(TOKEN_W * 1.25, TOKEN_H * 1.2), new THREE.MeshBasicMaterial({ map: this.glowFrameTex, color: '#5aff5a', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.rotation.x = -Math.PI / 2; glow.position.y = -0.002; group.add(glow);
    const rec = { group, mesh, glow, tex, canvas, key: tokenKey(u), data: { ...u, kw: u.kw.slice() }, face };
    mesh.userData = { kind: 'unit', uid: u.uid };
    return rec;
  }
  refreshToken(rec) {
    const k = tokenKey(rec.data);
    if (k === rec.key) return;
    rec.key = k; drawToken(rec.canvas, rec.data); rec.tex.needsUpdate = true;
  }

  // ------------------------------------------------------------ hand
  makeHandCard(hc) {
    const canvas = document.createElement('canvas');
    drawCard(canvas, hc.id);
    const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(HAND_W, HAND_H), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, toneMapped: false, fog: false }));
    m.renderOrder = 10;
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(HAND_W * 1.3, HAND_H * 1.22), new THREE.MeshBasicMaterial({ map: this.glowFrameTex, color: '#5aff5a', transparent: true, opacity: 0, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.renderOrder = 9; glow.position.z = -0.001; m.add(glow);
    m.userData = { kind: 'hand', uid: hc.uid, id: hc.id, glow, cur: new THREE.Vector3(0, -0.4, -0.5), rot: 0, scale: 1 };
    m.position.copy(m.userData.cur);
    return m;
  }

  layoutHand(dt) {
    const hand = this.view ? this.view.players[this.view.me].hand : [];
    const n = hand.length;
    const awayness = Math.min(1, Math.max(Math.abs(this.look.yaw) / 0.7, (this.look.pitch - this.basePitch) / 0.5, 0));
    const halfH = 0.5 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const halfW = halfH * this.camera.aspect;
    const baseY = -halfH + HAND_H * 0.42;
    const spacing = Math.min(0.064, (halfW * 1.1) / Math.max(1, n));
    const offsetX = this.camera.aspect > 1.2 ? halfW * 0.12 : 0; // keep clear of the chatbox
    hand.forEach((hc, i) => {
      const m = this.handMeshes.get(hc.uid);
      if (!m || m.userData.flying) return;
      const k = i - (n - 1) / 2;
      const hovered = this.hover && this.hover.userData.kind === 'hand' && this.hover.userData.uid === hc.uid;
      const selected = this.selection && this.selection.kind === 'card' && this.selection.uid === hc.uid;
      const lift = hovered ? 0.075 : selected ? 0.05 : 0;
      const target = new THREE.Vector3(offsetX + k * spacing, baseY - Math.abs(k) * 0.004 + lift + (hovered ? HAND_H * 0.25 : 0) - awayness * 0.2, -0.5 + (hovered ? 0.06 : 0) + i * 0.0005);
      const rot = hovered ? 0 : -k * 0.035;
      const scale = hovered ? 1.45 : 1;
      const a = 1 - Math.exp(-dt * 14);
      m.userData.cur.lerp(target, a);
      m.userData.rot += (rot - m.userData.rot) * a;
      m.userData.scale += (scale - m.userData.scale) * a;
      m.position.copy(m.userData.cur); m.rotation.z = m.userData.rot; m.scale.setScalar(m.userData.scale);
      m.renderOrder = hovered ? 30 : 10 + i; m.userData.glow.renderOrder = m.renderOrder - 1;
    });
  }

  // ------------------------------------------------------------ apply a new view (+ animate events)
  async applyView(view, events = []) {
    const prev = this.view;
    if (!prev) { this.view = view; this.reconcile(true); return; }
    this.busy = true;
    this.selection = null;
    this.view = { ...view, players: prev.players.map((p, i) => ({ ...view.players[i], board: p.board, hand: i === view.me ? p.hand : null })) };
    // keep old hand/board during animation; but switch turn info immediately
    try {
      for (const e of events) await this.playEvent(e, view);
    } catch (err) { console.error(err); }
    this.view = view;
    this.reconcile(false);
    this.busy = false;
    this.updateHighlights();
  }

  tokenPos(t) {
    if (t.kind === 'hero') {
      if (this.sideOf(t.p) === 'opp') return new THREE.Vector3(0, 1.4, -1.2);
      return this.camera.localToWorld(new THREE.Vector3(0, -0.25, -0.4));
    }
    const rec = t.uid != null && this.units.get(t.uid);
    return rec ? rec.group.position.clone() : this.slotPos(this.sideOf(t.p), t.slot);
  }

  async playEvent(e, finalView) {
    const me = finalView.me;
    switch (e.t) {
      case 'summon': {
        const c = CARDS[e.id];
        const rec = this.makeToken({ uid: e.uid, id: e.id, atk: c.atk, hp: c.hp, maxHp: c.hp, kw: c.kw.slice(), style: c.style, sick: true, frozen: false });
        rec.side = this.sideOf(e.p); rec.slot = e.slot;
        const from = this.cardOrigin(e.p, e.uid);
        rec.group.position.copy(from); rec.group.scale.setScalar(0.6);
        this.scene.add(rec.group); this.units.set(e.uid, rec);
        if (e.p !== me) this.cb.onReveal && this.cb.onReveal(e.id, e.p);
        sfx('card');
        const to = this.slotPos(rec.side, e.slot);
        await this.tween(380, (t) => {
          const k = ease.out(t);
          rec.group.position.lerpVectors(from, to, k); rec.group.position.y += Math.sin(k * Math.PI) * 0.18;
          rec.group.rotation.z = (1 - k) * 0.6; rec.group.scale.setScalar(0.6 + 0.4 * k);
        });
        sfx('thud'); this.puff(to, '#d8c8a8', 0.25);
        break;
      }
      case 'cast': {
        const from = this.cardOrigin(e.p, e.uid);
        if (e.p !== me) this.cb.onReveal && this.cb.onReveal(e.id, e.p);
        sfx('spell');
        const color = SPELL_COLOR[e.id] || '#ffd780';
        const to = e.target ? this.tokenPos(e.target) : new THREE.Vector3(0, TABLE_Y + 0.25, 0);
        await this.projectile(from, to, color, 420, 0.22);
        if (!e.target) this.burst(to, color, 0.9);
        break;
      }
      case 'attack': {
        const rec = this.units.get(e.uid);
        if (!rec) break;
        const start = rec.group.position.clone();
        const to = this.tokenPos(e.target);
        const style = rec.data.style;
        if (style === 'melee' || style === 'all') {
          sfx('swing');
          await this.tween(260, (t) => { const k = ease.inOut(t); rec.group.position.lerpVectors(start, to, k * 0.85); rec.group.position.y = start.y + Math.sin(k * Math.PI) * 0.15; });
          sfx('hit'); this.shake = Math.max(this.shake, e.target.kind === 'hero' && this.sideOf(e.target.p) === 'me' ? 0.6 : 0.2);
          this.tween(260, (t) => { rec.group.position.lerpVectors(to.clone().lerp(start, 0.15), start, ease.out(t)); rec.group.position.y = start.y + (1 - t) * 0.05; }).then(() => rec.group.position.copy(start));
        } else {
          sfx(style === 'ranged' ? 'bow' : 'spell');
          await this.tween(140, (t) => { rec.group.position.y = start.y + Math.sin(t * Math.PI) * 0.06; });
          rec.group.position.copy(start);
          await this.projectile(start.clone().add(new THREE.Vector3(0, 0.05, 0)), to, style === 'ranged' ? '#cfe8a0' : '#7ab0ff', 300, style === 'ranged' ? 0.05 : 0.15);
          sfx('hit');
        }
        break;
      }
      case 'dmg': {
        const pos = this.tokenPos(e.target);
        this.splat(e.target, `${e.n}`, 'dmg', e.adv);
        if (e.target.kind === 'unit') {
          const rec = this.units.get(e.target.uid);
          if (rec) { rec.data.hp -= e.n; this.refreshToken(rec); this.jolt(rec); }
        } else if (this.sideOf(e.target.p) === 'opp') { this.opp.flash(); this.cb.onHeroHit && this.cb.onHeroHit('opp', e.n); }
        else { this.shake = Math.max(this.shake, 0.5); this.cb.onHeroHit && this.cb.onHeroHit('me', e.n); }
        void pos;
        await wait(140);
        break;
      }
      case 'venom': this.splat(e.target, 'VENOM', 'venom'); await wait(120); break;
      case 'heal': {
        this.splat(e.target, `+${e.n}`, 'heal');
        if (e.target.kind === 'unit') { const rec = this.units.get(e.target.uid); if (rec) { rec.data.hp += e.n; this.refreshToken(rec); } }
        sfx('heal'); await wait(160); break;
      }
      case 'buff': {
        const rec = this.units.get(e.target.uid);
        if (rec) { rec.data.atk += e.atk; rec.data.hp += e.hp; rec.data.maxHp += e.hp; if (e.kw && !rec.data.kw.includes(e.kw)) rec.data.kw.push(e.kw); this.refreshToken(rec); this.burst(rec.group.position, '#7dff6a', 0.5); }
        sfx('buff'); await wait(220); break;
      }
      case 'freeze': {
        const rec = this.units.get(e.target.uid);
        if (rec) { rec.data.frozen = true; this.refreshToken(rec); this.burst(rec.group.position, '#a8e8ff', 0.6); }
        sfx('ice'); await wait(200); break;
      }
      case 'bounce': {
        const rec = this.units.get(e.target.uid);
        if (rec) {
          this.units.delete(e.target.uid);
          const from = rec.group.position.clone();
          const to = this.sideOf(e.target.p) === 'opp' ? new THREE.Vector3(0, 1.2, -1.0) : this.camera.localToWorld(new THREE.Vector3(0, -0.25, -0.5));
          this.burst(from, '#6ab0ff', 0.7);
          await this.tween(420, (t) => { rec.group.position.lerpVectors(from, to, ease.inOut(t)); rec.group.position.y += Math.sin(t * Math.PI) * 0.4; rec.group.scale.setScalar(1 - t * 0.6); });
          this.scene.remove(rec.group);
        }
        break;
      }
      case 'die': {
        const rec = this.units.get(e.uid);
        if (!rec) break;
        this.units.delete(e.uid);
        sfx('die');
        this.puff(rec.group.position, '#555048', 0.6);
        const y0 = rec.group.position.y;
        rec.face.opacity = 1;
        await this.tween(380, (t) => { rec.group.position.y = y0 - t * 0.01; rec.group.rotation.y = t * 0.6; rec.group.scale.setScalar(1 - t * 0.5); rec.face.opacity = 1 - t; });
        this.scene.remove(rec.group);
        break;
      }
      case 'draw': {
        if (e.p === me) sfx('draw');
        break;
      }
      case 'burn': if (e.p === me && e.id) this.cb.onLog && this.cb.onLog(`Your hand is full! ${CARDS[e.id].name} was burned.`); break;
      case 'fatigue': this.cb.onLog && this.cb.onLog(`${e.p === me ? 'You are' : 'Your opponent is'} out of cards: fatigue deals ${e.n} damage.`); break;
      case 'turn': this.cb.onTurn && this.cb.onTurn(e.p === me); if (e.p === me) sfx('turn'); await wait(250); break;
      case 'mana': sfx('coins'); break;
      default: break;
    }
  }

  cardOrigin(p, uid) {
    if (p === this.view.me) {
      const m = this.handMeshes.get(uid);
      if (m) { const w = m.getWorldPosition(new THREE.Vector3()); this.handGroup.remove(m); this.handMeshes.delete(uid); return w; }
      return this.camera.localToWorld(new THREE.Vector3(0, -0.2, -0.5));
    }
    return this.opp ? this.opp.fan.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3(0, 1.2, -1);
  }

  reconcile(instant) {
    const v = this.view; if (!v) return;
    const seen = new Set();
    v.players.forEach((P, p) => {
      const side = this.sideOf(p);
      P.board.forEach((u, slot) => {
        if (!u) return;
        seen.add(u.uid);
        let rec = this.units.get(u.uid);
        if (!rec) { rec = this.makeToken(u); this.scene.add(rec.group); this.units.set(u.uid, rec); rec.group.position.copy(this.slotPos(side, slot)); }
        rec.side = side; rec.slot = slot;
        rec.data = { ...u, kw: u.kw.slice() };
        this.refreshToken(rec);
        rec.group.position.copy(this.slotPos(side, slot)); rec.group.rotation.set(0, 0, 0); rec.group.scale.setScalar(1);
      });
    });
    for (const [uid, rec] of this.units) if (!seen.has(uid)) { this.scene.remove(rec.group); this.units.delete(uid); }
    // hand
    const mine = v.players[v.me].hand;
    const keep = new Set(mine.map((c) => c.uid));
    for (const [uid, m] of this.handMeshes) if (!keep.has(uid)) { this.handGroup.remove(m); this.handMeshes.delete(uid); }
    mine.forEach((hc, i) => {
      if (this.handMeshes.has(hc.uid)) return;
      const m = this.makeHandCard(hc);
      if (!instant) {
        // fly in from the deck
        const deckLocal = this.camera.worldToLocal(this.decks.me.position.clone().add(new THREE.Vector3(0, 0.05, 0)));
        m.userData.cur.copy(deckLocal); m.position.copy(deckLocal); m.userData.rot = 1.2;
      }
      void i;
      this.handGroup.add(m); this.handMeshes.set(hc.uid, m);
    });
    // opponent's held cards, decks, runes
    const opp = v.players[1 - v.me];
    this.opp && this.opp.setCardCount(opp.handCount);
    for (const [side, P] of [['me', v.players[v.me]], ['opp', opp]]) {
      const d = this.decks[side]; const h = Math.max(0.001, P.deckCount * 0.0025);
      d.scale.y = h; d.position.y = TABLE_Y + h / 2; d.visible = P.deckCount > 0;
      this.runes[side].forEach((m, i) => {
        const has = i < P.maxMana, lit = i < P.mana;
        m.visible = has || i < 10 && P.mana > i;
        m.material.emissiveIntensity = lit ? 2.2 : 0;
        m.material.color.set(lit ? '#7ab8ff' : '#33333a');
      });
    }
    this.updateHighlights();
    this.cb.onView && this.cb.onView(v);
  }

  // ------------------------------------------------------------ highlighting & targeting
  myTurn() { return this.view && this.view.winner === null && this.view.turn === this.view.me && !this.inputLocked; }

  currentTargets() {
    const v = this.view, me = v.me, s = this.selection;
    if (!s) return [];
    if (s.kind === 'attack') return attackTargets(v, me, s.slot);
    const hc = v.players[me].hand.find((c) => c.uid === s.uid);
    if (!hc) return [];
    const card = CARDS[hc.id];
    if (card.type === 'unit') return v.players[me].board.map((u, i) => (u ? null : { kind: 'slot', slot: i })).filter(Boolean);
    if (needsTarget(card)) return spellTargets(v, me, card);
    return [{ kind: 'table' }];
  }

  updateHighlights() {
    const v = this.view; if (!v) return;
    const me = v.me, my = this.myTurn() && !this.busy;
    const targets = my ? this.currentTargets() : [];
    const sel = this.selection;
    // hand glows
    for (const hc of v.players[me].hand) {
      const m = this.handMeshes.get(hc.uid); if (!m) continue;
      const g = m.userData.glow.material;
      const selected = sel && sel.kind === 'card' && sel.uid === hc.uid;
      const playable = my && canPlay(v, me, hc);
      g.color.set(selected ? '#ffd040' : '#5aff5a'); g.opacity = selected ? 1 : playable ? 0.75 : 0;
    }
    // unit glows
    for (const rec of this.units.values()) {
      const g = rec.glow.material;
      const isTarget = targets.some((t) => t.kind === 'unit' && this.sideOf(t.p) === rec.side && t.slot === rec.slot);
      const selected = sel && sel.kind === 'attack' && rec.side === 'me' && sel.slot === rec.slot;
      const ready = my && rec.side === 'me' && canUnitAttack(rec.data);
      if (selected) { g.color.set('#ffd040'); g.opacity = 1; }
      else if (isTarget) { g.color.set(sel && sel.kind === 'card' && rec.side === 'me' ? '#5ad0ff' : '#ff3a2a'); g.opacity = 1; }
      else if (ready && !sel) { g.color.set('#5aff5a'); g.opacity = 0.8; }
      else g.opacity = 0;
      rec.isTarget = isTarget;
    }
    // slots
    for (const s of this.slots) {
      const isT = s.userData.side === 'me' && targets.some((t) => t.kind === 'slot' && t.slot === s.userData.slot);
      s.material.opacity = isT ? 0.9 : 0.1; s.material.color.set(isT ? '#5ad0ff' : '#ffd780');
    }
    this.heroTargeted = targets.some((t) => t.kind === 'hero');
    this.tableTargeted = targets.some((t) => t.kind === 'table');
    this.updateAdvBadges(targets);
  }

  updateAdvBadges(targets) {
    // "x2" hints above targets the selected attacker has the combat advantage over
    this.overlay.querySelectorAll('.adv-badge').forEach((el) => el.remove());
    this.advBadges = [];
    const s = this.selection;
    if (!s || s.kind !== 'attack') return;
    const att = this.view.players[this.view.me].board[s.slot];
    for (const t of targets) {
      if (t.kind !== 'unit') continue;
      const def = this.view.players[t.p].board[t.slot];
      const rec = this.units.get(def.uid);
      const mine = attackMultiplier(att, def) > 1, theirs = attackMultiplier(def, att) > 1;
      if (!mine && !theirs) continue;
      const el = document.createElement('div');
      el.className = 'adv-badge ' + (mine ? 'good' : 'bad');
      el.textContent = mine ? '×2 damage!' : 'Hits back ×2';
      this.overlay.appendChild(el);
      this.advBadges.push({ el, rec });
    }
  }

  // ------------------------------------------------------------ input
  bindInput() {
    const el = this.renderer.domElement;
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    let drag = null, press = null;
    const clearPress = () => { if (press) { clearTimeout(press.timer); press = null; } };
    el.addEventListener('pointerdown', (e) => {
      this.cb.onMenu && this.cb.onMenu(null);
      this.setPointer(e);
      const hit = this.pick();
      if (e.button === 2) { drag = { look: true, right: true, x: e.clientX, y: e.clientY, moved: 0 }; return; }
      if (e.button !== 0) return;
      // touch: holding a finger down opens the "Choose Option" menu (like right-click)
      if (e.pointerType !== 'mouse') {
        clearPress();
        press = { x: e.clientX, y: e.clientY, timer: setTimeout(() => { press = null; drag = null; this.openMenu(e.clientX, e.clientY); }, 550) };
      }
      if (hit && this.handleClick(hit)) { drag = { x: e.clientX, y: e.clientY, fromSel: true }; return; }
      drag = { look: true, x: e.clientX, y: e.clientY, moved: 0 };
    });
    window.addEventListener('pointermove', (e) => {
      this.setPointer(e);
      if (press && Math.abs(e.clientX - press.x) + Math.abs(e.clientY - press.y) > 12) clearPress();
      if (drag && drag.look) {
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY; drag.moved = (drag.moved || 0) + Math.abs(dx) + Math.abs(dy);
        const k = e.pointerType === 'mouse' ? 0.004 : 0.006;
        this.look.ty = THREE.MathUtils.clamp(this.look.ty - dx * k, -2.2, 2.2);
        this.look.tp = THREE.MathUtils.clamp(this.look.tp - dy * k, -1.25, 0.55);
      }
    });
    const up = (e) => {
      clearPress();
      if (drag && drag.fromSel && this.selection && (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y)) > 25) {
        this.setPointer(e);
        const hit = this.pick();
        if (hit) this.handleClick(hit, true);
      } else if (drag && drag.right && drag.moved < 6) {
        this.openMenu(e.clientX, e.clientY);
      } else if (drag && drag.look && drag.moved < 5 && e.button === 0) {
        this.cancel();
      }
      drag = null;
      // fingers don't hover: forget the touch point so the preview follows the selection instead
      if (e.pointerType !== 'mouse') this.pointer.set(-10, -10);
    };
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    window.addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (e.key === 'Escape') { this.cancel(); this.cb.onMenu && this.cb.onMenu(null); }
      if (e.key === 'r' || e.key === 'R') this.resetLook();
      const step = 0.25;
      if (e.key === 'ArrowLeft' || e.key === 'a') this.look.ty = Math.min(2.2, this.look.ty + step);
      if (e.key === 'ArrowRight' || e.key === 'd') this.look.ty = Math.max(-2.2, this.look.ty - step);
      if (e.key === 'ArrowUp' || e.key === 'w') this.look.tp = Math.min(0.55, this.look.tp + step * 0.6);
      if (e.key === 'ArrowDown' || e.key === 's') this.look.tp = Math.max(-1.25, this.look.tp - step * 0.6);
    });
    el.addEventListener('wheel', (e) => { this.zoom = THREE.MathUtils.clamp((this.zoom || 0) + e.deltaY * -0.0008, -0.15, 0.35); }, { passive: true });
  }

  // OSRS-style "Choose Option" menu for whatever is under the cursor
  openMenu(x, y) {
    if (!this.view || !this.cb.onMenu) return;
    const r = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    const hit = this.pick();
    const v = this.view, me = v.me;
    const opts = [];
    const myTurn = this.myTurn() && !this.busy;
    const lvl = (c) => (c.level ? ` <span class="lvl ${c.level > 300 ? 'high' : c.level > 60 ? 'mid' : ''}">(level-${c.level})</span>` : '');
    if (hit && hit.userData.kind === 'hand') {
      const hc = v.players[me].hand.find((c) => c.uid === hit.userData.uid);
      const card = CARDS[hc.id];
      if (myTurn && canPlay(v, me, hc)) opts.push({ html: `${card.type === 'unit' ? 'Summon' : 'Use'} <span class="item">${card.name}</span>`, run: () => { if (!(this.selection && this.selection.uid === hc.uid)) this.handleClick(hit); } });
      opts.push({ html: `Examine <span class="item">${card.name}</span>`, run: () => this.cb.onExamine(card.id) });
    } else if (hit && hit.userData.kind === 'unit') {
      const rec = this.units.get(hit.userData.uid);
      const card = CARDS[rec.data.id];
      const t = this.hitToTarget(hit);
      const targets = this.currentTargets();
      if (this.selection && targets.some((x2) => sameTarget(x2, t))) opts.push({ html: `${this.selection.kind === 'attack' ? 'Attack' : 'Cast on'} <span class="npc">${card.name}</span>${lvl(card)}`, run: () => this.commit(t) });
      if (myTurn && rec.side === 'me' && canUnitAttack(rec.data) && !this.selection) opts.push({ html: `Attack with <span class="npc">${card.name}</span>${lvl(card)}`, run: () => this.handleClick(hit) });
      opts.push({ html: `Examine <span class="npc">${card.name}</span>${lvl(card)}`, run: () => this.cb.onExamine(card.id) });
    } else if (hit && hit.userData.kind === 'hero') {
      const opp = v.players[1 - me];
      if (this.selection && this.heroTargeted) opts.push({ html: `${this.selection.kind === 'attack' ? 'Attack' : 'Cast on'} <span class="player">${opp.name}</span>`, run: () => this.commit({ kind: 'hero', p: 1 - me }) });
      opts.push({ html: `Examine <span class="player">${opp.name}</span>`, run: () => this.cb.onExamine(null, opp.name) });
    }
    if (myTurn && !this.selection) opts.push({ html: 'End Turn', run: () => this.cb.onEndTurn && this.cb.onEndTurn() });
    if (this.selection) opts.push({ html: 'Cancel selection', run: () => this.cancel() });
    opts.push({ html: 'Cancel', run: () => {} });
    this.cb.onMenu({ x, y, opts });
  }

  setPointer(e) {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  }

  pick() {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hand = [...this.handMeshes.values()];
    const hh = this.raycaster.intersectObjects(hand, false);
    if (hh.length) {
      // pick the top-most (highest render order) card under the cursor
      hh.sort((a, b) => b.object.renderOrder - a.object.renderOrder);
      return hh[0].object;
    }
    const objs = [...[...this.units.values()].map((r) => r.mesh), this.oppHit, ...this.slots, this.tablePlane].filter(Boolean);
    const hits = this.raycaster.intersectObjects(objs, false);
    return hits.length ? hits[0].object : null;
  }

  hitToTarget(obj) {
    const d = obj.userData, v = this.view;
    if (d.kind === 'unit') {
      const rec = this.units.get(d.uid); if (!rec) return null;
      const p = rec.side === 'me' ? v.me : 1 - v.me;
      return { kind: 'unit', p, slot: rec.slot };
    }
    if (d.kind === 'hero') return { kind: 'hero', p: 1 - v.me };
    if (d.kind === 'slot') return d.side === 'me' ? { kind: 'slot', slot: d.slot } : null;
    if (d.kind === 'table') return { kind: 'table' };
    return null;
  }

  // returns true if the click started/changed a selection
  handleClick(obj, isDrop = false) {
    const v = this.view; if (!v) return false;
    const d = obj.userData;
    const me = v.me;
    if (!this.myTurn() || this.busy) {
      if (d.kind === 'hand' || d.kind === 'unit') this.cb.onPrompt && this.cb.onPrompt(this.busy ? '' : 'Wait for your turn.');
      return false;
    }
    if (d.kind === 'hand') {
      const hc = v.players[me].hand.find((c) => c.uid === d.uid);
      if (this.selection && this.selection.kind === 'card' && this.selection.uid === d.uid) {
        if (!isDrop) this.cancel();
        return false;
      }
      if (!canPlay(v, me, hc)) { this.explainUnplayable(hc); return false; }
      this.selection = { kind: 'card', uid: d.uid };
      sfx('pick');
      this.promptForSelection();
      this.updateHighlights();
      return true;
    }
    const t = this.hitToTarget(obj);
    const targets = this.currentTargets();
    if (this.selection && t) {
      let valid = targets.find((x) => (x.kind === 'slot' && t.kind === 'slot' && x.slot === t.slot) || (x.kind === 'table' && (t.kind === 'table' || t.kind === 'slot')) || sameTarget(x, t));
      // clicking the table while placing a monster: use the nearest empty slot
      if (!valid && this.selection.kind === 'card' && targets.length && targets[0].kind === 'slot' && (t.kind === 'table' || t.kind === 'slot')) {
        const pt = this.raycaster.intersectObject(this.tablePlane)[0];
        if (pt) {
          let best = null, bd = 1e9;
          for (const x of targets) { const dd = this.slotPos('me', x.slot).distanceTo(pt.point); if (dd < bd) { bd = dd; best = x; } }
          if (bd < 0.6) valid = best;
        }
      }
      if (valid) { this.commit(valid); return false; }
    }
    if (d.kind === 'unit') {
      const rec = this.units.get(d.uid);
      if (rec && rec.side === 'me') {
        const u = v.players[me].board[rec.slot];
        if (canUnitAttack(u)) {
          if (this.selection && this.selection.kind === 'attack' && this.selection.slot === rec.slot) { this.cancel(); return false; }
          this.selection = { kind: 'attack', slot: rec.slot }; sfx('pick');
          this.promptForSelection(); this.updateHighlights(); return true;
        }
        this.explainCantAttack(u);
        return false;
      }
    }
    if (this.selection && !isDrop) this.cancel();
    return false;
  }

  promptForSelection() {
    const s = this.selection; const v = this.view;
    if (!s) return;
    if (s.kind === 'attack') {
      const u = v.players[v.me].board[s.slot];
      const guard = v.players[1 - v.me].board.some((x) => x && x.kw.includes('guard'));
      this.cb.onPrompt(`${CARDS[u.id].name}: choose what to attack${guard ? ' (a Guard is in the way!)' : ' — a monster or your opponent'}.`);
      return;
    }
    const hc = v.players[v.me].hand.find((c) => c.uid === s.uid); const card = CARDS[hc.id];
    if (card.type === 'unit') this.cb.onPrompt(`Place ${card.name}: click a glowing spot on your side of the table.`);
    else if (needsTarget(card)) this.cb.onPrompt(`${card.name}: choose a target.`);
    else this.cb.onPrompt(`${card.name}: click the table to use it.`);
  }

  explainUnplayable(hc) {
    const v = this.view, P = v.players[v.me], card = CARDS[hc.id];
    if (card.cost > P.mana) this.cb.onPrompt(`Not enough runes: ${card.name} costs ${card.cost}, you have ${P.mana}.`);
    else if (card.type === 'unit') this.cb.onPrompt('Your side of the table is full (5 monsters max).');
    else this.cb.onPrompt(`${card.name} has no valid target right now.`);
    sfx('nope');
  }
  explainCantAttack(u) {
    if (!u) return;
    if (u.frozen) this.cb.onPrompt(`${CARDS[u.id].name} is frozen and can't attack this turn.`);
    else if (u.attacked) this.cb.onPrompt(`${CARDS[u.id].name} already attacked this turn.`);
    else if (u.atk <= 0) this.cb.onPrompt(`${CARDS[u.id].name} has no Attack.`);
    else if (u.sick) this.cb.onPrompt(`${CARDS[u.id].name} was just played. Monsters can attack from your next turn (unless they have Charge).`);
    sfx('nope');
  }

  commit(t) {
    const s = this.selection; if (!s) return;
    this.selection = null;
    this.cb.onPrompt('');
    if (s.kind === 'attack') this.cb.onAction({ type: 'attack', slot: s.slot, target: { kind: t.kind, p: t.p, slot: t.slot } });
    else if (t.kind === 'slot') this.cb.onAction({ type: 'play', uid: s.uid, slot: t.slot });
    else if (t.kind === 'table') this.cb.onAction({ type: 'play', uid: s.uid });
    else this.cb.onAction({ type: 'play', uid: s.uid, target: { kind: t.kind, p: t.p, slot: t.slot } });
    this.updateHighlights();
  }

  cancel() {
    if (!this.selection) return;
    this.selection = null; this.cb.onPrompt(''); this.updateHighlights();
  }

  // ------------------------------------------------------------ effects
  tween(ms, fn) {
    return new Promise((resolve) => this.anims.push({ t: 0, ms, fn, resolve }));
  }

  projectile(from, to, color, ms, size = 0.15) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    sp.scale.setScalar(size); this.scene.add(sp);
    const trail = [];
    return this.tween(ms, (t) => {
      sp.position.lerpVectors(from, to, t); sp.position.y += Math.sin(t * Math.PI) * 0.18;
      if (Math.random() < 0.7) { const s2 = sp.clone(); s2.material = sp.material.clone(); s2.material.opacity = 0.6; this.scene.add(s2); trail.push(s2); }
      trail.forEach((x) => { x.material.opacity *= 0.85; x.scale.multiplyScalar(0.94); });
      if (t >= 1) { this.scene.remove(sp); trail.forEach((x) => this.scene.remove(x)); this.burst(to, color, 0.6); }
    });
  }

  burst(pos, color, size = 0.5) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    sp.position.copy(pos); sp.position.y += 0.03; this.scene.add(sp);
    this.tween(450, (t) => { sp.scale.setScalar(size * (0.3 + t)); sp.material.opacity = 1 - t; if (t >= 1) this.scene.remove(sp); });
  }

  puff(pos, color, size) {
    for (let i = 0; i < 6; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color, depthWrite: false, transparent: true, opacity: 0.5 }));
      const dir = new THREE.Vector3(Math.cos(i), 0.6, Math.sin(i)).multiplyScalar(0.12);
      sp.position.copy(pos); this.scene.add(sp);
      const p0 = pos.clone();
      this.tween(600, (t) => { sp.position.copy(p0).addScaledVector(dir, ease.out(t)); sp.scale.setScalar(size * (0.3 + t * 0.6)); sp.material.opacity = 0.5 * (1 - t); if (t >= 1) this.scene.remove(sp); });
    }
  }

  jolt(rec) {
    const p0 = this.slotPos(rec.side, rec.slot);
    this.tween(220, (t) => { rec.group.position.x = p0.x + Math.sin(t * 30) * 0.012 * (1 - t); });
  }

  splat(target, text, kind, adv = false) {
    const el = document.createElement('div');
    el.className = `hitsplat ${kind}${adv ? ' adv' : ''}`;
    el.innerHTML = `<span>${text}</span>${adv ? '<em>×2</em>' : ''}`;
    this.overlay.appendChild(el);
    const isMe = target.kind === 'hero' && this.sideOf(target.p) === 'me';
    const pos = isMe ? null : this.tokenPos(target);
    const jitter = (Math.random() - 0.5) * 30;
    const rec = { el, pos, isMe, jitter, born: performance.now() };
    (this.splats || (this.splats = [])).push(rec);
    setTimeout(() => { el.remove(); this.splats = this.splats.filter((s) => s !== rec); }, 1300);
  }

  // ------------------------------------------------------------ opponent head
  oppLookAtPoint(p) {
    if (!this.opp) return;
    const h = this.opp.headWorldPos();
    const d = p.clone().sub(h);
    this.opp.lookAt(Math.atan2(d.x, d.z), Math.atan2(-d.y, Math.hypot(d.x, d.z)));
  }
  oppLookAtPlayer() { this.oppLookAtPoint(this.camBase.clone()); }
  oppLookAtTarget(t) {
    if (!t) return this.oppLookAtPlayer();
    if (t.kind === 'hero') return this.oppLookAtPlayer();
    const v = this.view;
    const side = this.sideOf(t.p);
    this.oppLookAtPoint(this.slotPos(side, t.slot != null ? t.slot : 2));
    void v;
  }
  setOppLook(yaw, pitch) { this.opp && this.opp.lookAt(yaw, -pitch); }
  resetLook() { this.look.ty = 0; this.look.tp = this.basePitch; this.zoom = 0; }
  getLook() { return { yaw: +this.look.yaw.toFixed(3), pitch: +this.look.pitch.toFixed(3) }; }

  // ------------------------------------------------------------ frame loop
  worldToScreen(v) {
    const p = v.clone().project(this.camera);
    const r = this.renderer.domElement;
    return { x: (p.x * 0.5 + 0.5) * r.clientWidth, y: (-p.y * 0.5 + 0.5) * r.clientHeight, vis: p.z < 1 && p.z > -1 };
  }

  resize() {
    const w = this.container.clientWidth || window.innerWidth, h = this.container.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h);
    const aspect = w / h;
    this.camera.aspect = aspect;
    const wasPitch = this.basePitch;
    if (aspect < 1) {
      // portrait phone: sit further back and higher so all 5 spots on each side fit
      this.camBase.set(0, 2.15, 2.2); this.basePitch = -0.66;
      const half = Math.atan(0.82 / 1.95);
      this.camera.fov = Math.min(88, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(half) / aspect)));
    } else if (aspect < 1.45) {
      this.camBase.set(0, 1.7, 1.6); this.basePitch = -0.52; this.camera.fov = 64;
    } else {
      this.camBase.copy(CAM_POS); this.basePitch = BASE_PITCH; this.camera.fov = 60;
    }
    if (wasPitch !== this.basePitch && !this.menuMode) { this.look.tp += this.basePitch - wasPitch; }
    this.camera.updateProjectionMatrix();
  }

  frame() {
    const dt = Math.min(0.25, this.clock.getDelta());
    const t = this.clock.elapsedTime;
    // look smoothing
    const k = 1 - Math.exp(-dt * 10);
    this.look.yaw += (this.look.ty - this.look.yaw) * k;
    this.look.pitch += (this.look.tp - this.look.pitch) * k;
    this.camera.rotation.set(this.look.pitch + Math.sin(t * 0.9) * 0.004, this.look.yaw + Math.sin(t * 0.6) * 0.004, 0);
    const z = this.zoom || 0;
    const fwd = new THREE.Vector3(0, 0, -1).applyEuler(this.camera.rotation);
    this.camera.position.copy(this.camBase).addScaledVector(fwd, z);
    if (this.shake > 0) {
      this.camera.position.x += (Math.random() - 0.5) * this.shake * 0.03;
      this.camera.position.y += (Math.random() - 0.5) * this.shake * 0.03;
      this.shake = Math.max(0, this.shake - dt * 2.5);
    }
    // anims
    for (const a of this.anims) { a.t = Math.min(1, a.t + (dt * 1000) / a.ms); a.fn(a.t); }
    this.anims = this.anims.filter((a) => { if (a.t >= 1) { a.resolve(); return false; } return true; });

    this.tavern.update(dt, t);
    if (this.opp) this.opp.update(dt);

    // hover
    if (this.view) {
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const hit = this.pick();
      this.hover = hit;
      let info = null;
      if (hit) {
        const d = hit.userData;
        if (d.kind === 'hand') info = { cardId: d.id };
        else if (d.kind === 'unit') { const rec = this.units.get(d.uid); if (rec) info = { cardId: rec.data.id, unit: rec.data, enemy: rec.side === 'opp' }; }
      }
      if (!info && this.selection) {
        if (this.selection.kind === 'card') { const hc = this.view.players[this.view.me].hand.find((c) => c.uid === this.selection.uid); if (hc) info = { cardId: hc.id }; }
        else { const u = this.view.players[this.view.me].board[this.selection.slot]; if (u) info = { cardId: u.id, unit: u, enemy: false }; }
      }
      const key = info ? info.cardId + (info.unit ? tokenKey(info.unit) : '') : '';
      if (key !== this._hoverKey) { this._hoverKey = key; this.cb.onHover && this.cb.onHover(info); }
      const targetable = hit && this.selection && this.hitToTarget(hit);
      this.renderer.domElement.style.cursor = hit && (hit.userData.kind === 'hand' || (hit.userData.kind === 'unit') || (targetable && this.selection)) ? 'pointer' : 'default';
      this.layoutHand(dt);
      // pulsing target glows
      const pulse = 0.65 + Math.sin(t * 6) * 0.35;
      for (const rec of this.units.values()) if (rec.isTarget) rec.glow.material.opacity = pulse;
      this.oppRing.material.opacity = this.heroTargeted ? pulse * 0.9 : 0;
      this.oppRing.lookAt(this.camera.position);
      if (this.tableTargeted) for (const s of this.slots) if (s.userData.side === 'me') s.material.opacity = 0.3 + pulse * 0.3;
    }
    this.renderer.render(this.scene, this.camera);
    this.updateOverlay();
  }

  updateOverlay() {
    const now = performance.now();
    for (const s of this.splats || []) {
      let x, y;
      if (s.isMe) { const el = document.getElementById('hud-me'); const r = el ? el.getBoundingClientRect() : { left: 100, top: window.innerHeight - 100, width: 0, height: 0 }; x = r.left + r.width / 2; y = r.top + r.height / 2; }
      else { const p = this.worldToScreen(s.pos); x = p.x; y = p.y; }
      const age = (now - s.born) / 1300;
      s.el.style.transform = `translate(${x + s.jitter - 32}px, ${y - 32 - age * 30}px) scale(${age < 0.1 ? 0.6 + age * 4 : 1})`;
      s.el.style.opacity = age > 0.75 ? String(1 - (age - 0.75) * 4) : '1';
    }
    for (const b of this.advBadges || []) {
      const p = this.worldToScreen(b.rec.group.position.clone().add(new THREE.Vector3(0, 0, -0.17)));
      b.el.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -100%)`;
    }
    if (this.opp && this.cb.onOverhead) {
      const p = this.worldToScreen(this.opp.headWorldPos().add(new THREE.Vector3(0, 0.42, 0)));
      this.cb.onOverhead(p);
    }
  }
}
