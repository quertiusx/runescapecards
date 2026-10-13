// Tiny WebAudio synth for sound effects + tavern ambience. No audio files.
let ctx = null, master = null, muted = false, ambience = null;

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function noiseBuffer(sec = 1) {
  const b = ctx.createBuffer(1, ctx.sampleRate * sec, ctx.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

function tone(freq, dur, { type = 'sine', vol = 0.3, slide = 0, delay = 0 } = {}) {
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.05);
}

function noise(dur, { freq = 1000, q = 1, vol = 0.3, type = 'bandpass', delay = 0, slide = 0 } = {}) {
  const t = ctx.currentTime + delay;
  const s = ctx.createBufferSource(); s.buffer = noiseBuffer(dur + 0.1);
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
  if (slide) f.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
  const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(master); s.start(t); s.stop(t + dur + 0.1);
}

const SFX = {
  card: () => noise(0.12, { freq: 2500, q: 0.8, vol: 0.25, slide: 0.4 }),
  draw: () => noise(0.1, { freq: 3000, q: 0.7, vol: 0.15, slide: 0.5 }),
  pick: () => tone(660, 0.08, { type: 'triangle', vol: 0.12 }),
  nope: () => tone(160, 0.18, { type: 'square', vol: 0.06, slide: 0.7 }),
  thud: () => { tone(110, 0.18, { vol: 0.35, slide: 0.5 }); noise(0.08, { freq: 400, vol: 0.2 }); },
  swing: () => noise(0.22, { freq: 900, q: 2, vol: 0.25, slide: 3 }),
  hit: () => { noise(0.15, { freq: 300, q: 0.7, vol: 0.5, type: 'lowpass' }); tone(80, 0.2, { vol: 0.4, slide: 0.5 }); },
  bow: () => { tone(420, 0.12, { type: 'triangle', vol: 0.15, slide: 0.5 }); noise(0.2, { freq: 4000, q: 3, vol: 0.12, slide: 0.3, delay: 0.03 }); },
  spell: () => { tone(500, 0.35, { type: 'sawtooth', vol: 0.05, slide: 2 }); noise(0.4, { freq: 1500, q: 4, vol: 0.12, slide: 2.5 }); },
  ice: () => { for (let i = 0; i < 4; i++) tone(1800 + i * 300, 0.25, { type: 'sine', vol: 0.06, delay: i * 0.04 }); },
  heal: () => { tone(523, 0.3, { type: 'triangle', vol: 0.12 }); tone(784, 0.4, { type: 'triangle', vol: 0.1, delay: 0.08 }); },
  buff: () => { tone(392, 0.2, { type: 'triangle', vol: 0.1 }); tone(587, 0.3, { type: 'triangle', vol: 0.1, delay: 0.07 }); },
  die: () => { noise(0.5, { freq: 600, q: 0.5, vol: 0.3, slide: 0.2, type: 'lowpass' }); tone(200, 0.4, { type: 'sawtooth', vol: 0.06, slide: 0.3 }); },
  coins: () => { for (let i = 0; i < 3; i++) tone(2400 + i * 400, 0.12, { type: 'square', vol: 0.04, delay: i * 0.06 }); },
  turn: () => { tone(392, 0.25, { type: 'triangle', vol: 0.15 }); tone(523, 0.25, { type: 'triangle', vol: 0.15, delay: 0.12 }); tone(659, 0.45, { type: 'triangle', vol: 0.15, delay: 0.24 }); },
  win: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.5, { type: 'triangle', vol: 0.15, delay: i * 0.14 })); },
  lose: () => { [392, 349, 311, 262].forEach((f, i) => tone(f, 0.5, { type: 'triangle', vol: 0.13, delay: i * 0.18 })); },
  chat: () => tone(880, 0.06, { type: 'square', vol: 0.03 }),
};

export function sfx(name) {
  if (muted || !ac()) return;
  try { SFX[name] && SFX[name](); } catch (e) { /* audio is best-effort */ }
}

// Fireplace crackle + low room murmur.
export function startAmbience() {
  if (!ac() || ambience) return;
  const out = ctx.createGain(); out.gain.value = muted ? 0 : 1; out.connect(master);
  const src = ctx.createBufferSource(); src.buffer = noiseBuffer(4); src.loop = true;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 350;
  const g = ctx.createGain(); g.gain.value = 0.06;
  src.connect(lp).connect(g).connect(out); src.start();
  const crackle = setInterval(() => {
    if (muted || Math.random() < 0.4) return;
    const t = ctx.currentTime;
    const s = ctx.createBufferSource(); s.buffer = noiseBuffer(0.05);
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 2000 + Math.random() * 3000;
    const cg = ctx.createGain(); cg.gain.setValueAtTime(0.05 + Math.random() * 0.12, t); cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    s.connect(f).connect(cg).connect(out); s.start(t);
  }, 90);
  ambience = { out, crackle };
}

export function setMuted(m) {
  muted = m;
  if (ambience) ambience.out.gain.value = m ? 0 : 1;
}
export function isMuted() { return muted; }
