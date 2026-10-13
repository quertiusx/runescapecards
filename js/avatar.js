// Seated duellists: OSRS-style player models (see models.js). Faces +Z.
import * as THREE from '../vendor/three.module.min.js';
import { AVATAR_MODELS } from './models.js';

export const AVATARS = {
  knight: { name: 'Rune Knight', desc: 'Full rune and a dragon scimitar.' },
  wizard: { name: 'Wizard', desc: 'Blue robes and a pointy hat.' },
  ranger: { name: 'Ranger', desc: 'Green d\'hide and a keen eye.' },
};

const MODEL_SCALE = 0.8; // OSRS model units -> metres

function mesh(geo, material, x = 0, y = 0, z = 0, parent) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  if (parent) parent.add(m);
  return m;
}

export function buildChair(woodMat) {
  const g = new THREE.Group();
  mesh(new THREE.BoxGeometry(0.52, 0.06, 0.5), woodMat, 0, 0.46, 0, g);
  for (const x of [-0.22, 0.22]) for (const z of [-0.21, 0.21]) mesh(new THREE.BoxGeometry(0.05, 0.46, 0.05), woodMat, x, 0.23, z, g);
  for (const x of [-0.22, 0.22]) mesh(new THREE.BoxGeometry(0.06, 0.75, 0.06), woodMat, x, 0.84, -0.22, g);
  mesh(new THREE.BoxGeometry(0.5, 0.12, 0.04), woodMat, 0, 1.12, -0.22, g);
  mesh(new THREE.BoxGeometry(0.5, 0.08, 0.04), woodMat, 0, 0.85, -0.22, g);
  return g;
}

export class Avatar {
  constructor(type, cardBackTex, woodMat) {
    this.type = type;
    this.group = new THREE.Group();
    this.mats = [];
    this.t = Math.random() * 10;
    this.targetYaw = 0; this.targetPitch = 0.35;
    this.yaw = 0; this.pitch = 0.35;
    this.flashT = 0;
    this.cardBackTex = cardBackTex;
    this.group.add(buildChair(woodMat));

    const parts = (AVATAR_MODELS[type] || AVATAR_MODELS.knight)('sit');
    parts.root.scale.setScalar(MODEL_SCALE);
    parts.root.position.set(0, 0, -0.04);
    // own copies of the shared OSRS materials so the hit flash only tints this model
    parts.root.traverse((o) => {
      if (o.isMesh) { o.material = o.material.clone(); o.material.color.multiplyScalar(0.62); this.mats.push(o.material); o.castShadow = true; }
    });
    this.group.add(parts.root);
    this.torso = parts.torso; this.head = parts.head;
    this.torsoBaseY = this.torso.position.y;
    // card fan held out in front of the hands
    this.fan = new THREE.Group();
    this.fan.position.set(0, 0.38, 0.62);
    this.fan.rotation.x = -0.25;
    this.fan.scale.setScalar(1 / MODEL_SCALE);
    this.torso.add(this.fan);
  }

  setCardCount(n) {
    while (this.fan.children.length > n) this.fan.remove(this.fan.children[this.fan.children.length - 1]);
    const geo = this._cardGeo || (this._cardGeo = new THREE.PlaneGeometry(0.075, 0.105));
    const backMat = this._backMat || (this._backMat = new THREE.MeshStandardMaterial({ map: this.cardBackTex, roughness: 0.6, side: THREE.DoubleSide }));
    while (this.fan.children.length < n) { const c = new THREE.Mesh(geo, backMat); c.castShadow = true; this.fan.add(c); }
    const spread = Math.min(0.16, 0.6 / Math.max(1, n));
    this.fan.children.forEach((c, i) => {
      const k = i - (n - 1) / 2;
      c.position.set(k * 0.028, -Math.abs(k) * 0.004, i * 0.0015);
      c.rotation.set(0, 0, -k * spread);
    });
  }

  lookAt(yaw, pitch) { this.targetYaw = yaw; this.targetPitch = pitch; }

  flash() { this.flashT = 1; }

  update(dt) {
    this.t += dt;
    this.torso.position.y = this.torsoBaseY + Math.sin(this.t * 1.6) * 0.01;
    this.torso.rotation.x = 0.06 + Math.sin(this.t * 0.7) * 0.015;
    const k = 1 - Math.exp(-dt * 6);
    this.yaw += (this.targetYaw - this.yaw) * k;
    this.pitch += (this.targetPitch - this.pitch) * k;
    this.head.rotation.set(THREE.MathUtils.clamp(this.pitch, -0.5, 0.8), THREE.MathUtils.clamp(this.yaw, -1.3, 1.3), Math.sin(this.t * 0.5) * 0.03, 'YXZ');
    if (this.flashT > 0) {
      this.flashT = Math.max(0, this.flashT - dt * 2.5);
      for (const m of this.mats) { if (!m.userData.baseEm) m.userData.baseEm = m.emissive.clone(); m.emissive.setRGB(this.flashT * 0.8, 0, 0).add(m.userData.baseEm); }
    }
  }

  headWorldPos(target = new THREE.Vector3()) {
    return this.head.getWorldPosition(target);
  }
}
