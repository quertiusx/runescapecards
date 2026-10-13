// Rules engine. Pure state + actions, no rendering. The host (or the local
// AI game) owns the real state; clients only ever see viewFor() snapshots.
import { CARDS, DECK, hasAdvantage } from './cards.js';

export const MAX_HP = 30;
export const MAX_MANA = 10;
export const BOARD_SIZE = 5;
export const HAND_LIMIT = 10;
export const TURN_SECONDS = 75;

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function createGame(p0, p1) {
  const state = {
    players: [p0, p1].map((p) => ({
      name: p.name, avatar: p.avatar,
      hp: MAX_HP, maxHp: MAX_HP, mana: 0, maxMana: 0,
      deck: shuffle(DECK.slice()), hand: [], board: Array(BOARD_SIZE).fill(null), fatigue: 0,
    })),
    turn: Math.random() < 0.5 ? 0 : 1,
    turnNumber: 0,
    winner: null,
    nextUid: 1,
  };
  const events = [];
  const first = state.turn;
  for (let i = 0; i < 3; i++) draw(state, first, events);
  for (let i = 0; i < 4; i++) draw(state, 1 - first, events);
  state.players[1 - first].hand.push({ uid: state.nextUid++, id: 'coins' });
  startTurn(state, first, events);
  return { state, events };
}

// ---------------------------------------------------------------- helpers
export const heroTarget = (p) => ({ kind: 'hero', p });
export const unitTarget = (p, slot) => ({ kind: 'unit', p, slot });
export const sameTarget = (a, b) => a && b && a.kind === b.kind && a.p === b.p && (a.kind === 'hero' || a.slot === b.slot);

export function canUnitAttack(u) {
  return !!u && !u.attacked && !u.frozen && u.atk > 0 && (!u.sick || u.kw.includes('charge'));
}

// Works on full state or a view (only needs boards).
export function attackTargets(s, p, slot) {
  const u = s.players[p].board[slot];
  if (!canUnitAttack(u)) return [];
  const enemy = 1 - p;
  const eb = s.players[enemy].board;
  const guards = [];
  const all = [];
  eb.forEach((e, i) => {
    if (!e) return;
    all.push(unitTarget(enemy, i));
    if (e.kw.includes('guard')) guards.push(unitTarget(enemy, i));
  });
  if (guards.length) return guards;
  return [...all, heroTarget(enemy)];
}

export function spellTargets(s, p, card) {
  const out = [];
  const add = (q) => s.players[q].board.forEach((u, i) => u && out.push(unitTarget(q, i)));
  switch (card.target) {
    case 'unit': add(1 - p); add(p); break;
    case 'enemyUnit': add(1 - p); break;
    case 'friendlyUnit': add(p); break;
    case 'any': add(1 - p); add(p); out.push(heroTarget(1 - p)); break;
    default: break;
  }
  return out;
}

export function needsTarget(card) {
  return card.type === 'spell' && card.target && card.target !== 'none';
}

// Can player p play this hand card right now? (Requires p's real hand.)
export function canPlay(s, p, handCard) {
  if (s.winner !== null || s.turn !== p) return false;
  const P = s.players[p];
  const card = CARDS[handCard.id];
  if (card.cost > P.mana) return false;
  if (card.type === 'unit') return P.board.some((x) => !x);
  if (needsTarget(card)) return spellTargets(s, p, card).length > 0;
  return true;
}

export function attackMultiplier(att, def) {
  return hasAdvantage(att.style, def.style) ? 2 : 1;
}

function getUnit(s, t) {
  return t && t.kind === 'unit' ? s.players[t.p].board[t.slot] : null;
}

function makeUnit(s, uid, id) {
  const c = CARDS[id];
  return { uid, id, atk: c.atk, hp: c.hp, maxHp: c.hp, style: c.style, kw: c.kw.slice(), sick: true, attacked: false, frozen: false, frozenTurn: 0 };
}

function tgtEv(s, t) {
  if (t.kind === 'hero') return { kind: 'hero', p: t.p };
  const u = getUnit(s, t);
  return { kind: 'unit', p: t.p, slot: t.slot, uid: u ? u.uid : null };
}

// ---------------------------------------------------------------- core ops
function draw(s, p, events) {
  const P = s.players[p];
  if (!P.deck.length) {
    P.fatigue++;
    events.push({ t: 'fatigue', p, n: P.fatigue });
    damage(s, heroTarget(p), P.fatigue, events);
    return;
  }
  const id = P.deck.pop();
  if (P.hand.length >= HAND_LIMIT) {
    events.push({ t: 'burn', p, id });
    return;
  }
  const uid = s.nextUid++;
  P.hand.push({ uid, id });
  events.push({ t: 'draw', p, uid });
}

function damage(s, t, n, events, opts = {}) {
  if (n <= 0) return 0;
  if (t.kind === 'hero') {
    const P = s.players[t.p];
    P.hp -= n;
    events.push({ t: 'dmg', target: tgtEv(s, t), n, adv: !!opts.adv });
  } else {
    const u = getUnit(s, t);
    if (!u) return 0;
    u.hp -= n;
    events.push({ t: 'dmg', target: tgtEv(s, t), n, adv: !!opts.adv });
    if (opts.venom && u.hp > 0) {
      u.hp = 0;
      events.push({ t: 'venom', target: tgtEv(s, t) });
    }
  }
  return n;
}

function healHero(s, p, n, events) {
  const P = s.players[p];
  const amt = Math.min(n, P.maxHp - P.hp);
  if (amt <= 0) return;
  P.hp += amt;
  events.push({ t: 'heal', target: heroTarget(p), n: amt });
}

function cleanup(s, events) {
  for (let p = 0; p < 2; p++) {
    const b = s.players[p].board;
    for (let i = 0; i < b.length; i++) {
      if (b[i] && b[i].hp <= 0) {
        events.push({ t: 'die', p, slot: i, uid: b[i].uid, id: b[i].id });
        b[i] = null;
      }
    }
  }
  if (s.winner === null) {
    const d0 = s.players[0].hp <= 0, d1 = s.players[1].hp <= 0;
    if (d0 || d1) {
      s.winner = d0 && d1 ? 'draw' : d0 ? 1 : 0;
      events.push({ t: 'win', winner: s.winner });
    }
  }
}

function runEffect(s, p, e, target, events) {
  const enemy = 1 - p;
  const eb = s.players[enemy].board;
  switch (e.fx) {
    case 'dmg': damage(s, target, e.n, events); break;
    case 'dmgEnemyHero': damage(s, heroTarget(enemy), e.n, events); break;
    case 'dmgRandomEnemyUnit': {
      const slots = eb.map((u, i) => (u ? i : -1)).filter((i) => i >= 0);
      if (slots.length) damage(s, unitTarget(enemy, slots[Math.floor(Math.random() * slots.length)]), e.n, events);
      break;
    }
    case 'dmgAllEnemyUnits':
      eb.forEach((u, i) => u && damage(s, unitTarget(enemy, i), e.n, events));
      break;
    case 'dmgAllEnemies':
      eb.forEach((u, i) => u && damage(s, unitTarget(enemy, i), e.n, events));
      damage(s, heroTarget(enemy), e.n, events);
      break;
    case 'draw': for (let i = 0; i < e.n; i++) draw(s, p, events); break;
    case 'healHero': healHero(s, p, e.n, events); break;
    case 'healAllFriendly':
      s.players[p].board.forEach((u, i) => {
        if (u && u.hp < u.maxHp) {
          const amt = u.maxHp - u.hp;
          u.hp = u.maxHp;
          events.push({ t: 'heal', target: tgtEv(s, unitTarget(p, i)), n: amt });
        }
      });
      break;
    case 'buff': {
      const u = getUnit(s, target);
      if (!u) break;
      u.atk += e.atk; u.hp += e.hp; u.maxHp += e.hp;
      if (e.kw && !u.kw.includes(e.kw)) u.kw.push(e.kw);
      events.push({ t: 'buff', target: tgtEv(s, target), atk: e.atk, hp: e.hp, kw: e.kw || null });
      break;
    }
    case 'freeze': {
      const u = getUnit(s, target);
      if (!u || u.hp <= 0) break;
      u.frozen = true; u.frozenTurn = s.turnNumber;
      events.push({ t: 'freeze', target: tgtEv(s, target) });
      break;
    }
    case 'bounce': {
      const u = getUnit(s, target);
      if (!u) break;
      const owner = s.players[target.p];
      events.push({ t: 'bounce', target: tgtEv(s, target), id: u.id });
      owner.board[target.slot] = null;
      if (owner.hand.length < HAND_LIMIT) owner.hand.push({ uid: s.nextUid++, id: u.id });
      break;
    }
    case 'gainMana':
      s.players[p].mana = Math.min(MAX_MANA, s.players[p].mana + e.n);
      events.push({ t: 'mana', p });
      break;
    default: break;
  }
}

function startTurn(s, p, events) {
  s.turn = p;
  s.turnNumber++;
  s.turnStartedAt = Date.now();
  const P = s.players[p];
  P.maxMana = Math.min(MAX_MANA, P.maxMana + 1);
  P.mana = P.maxMana;
  for (const u of P.board) if (u) { u.sick = false; u.attacked = false; }
  events.push({ t: 'turn', p, n: s.turnNumber });
  draw(s, p, events);
  cleanup(s, events);
}

function endTurn(s, p, events) {
  for (const u of s.players[p].board) {
    if (u && u.frozen && u.frozenTurn < s.turnNumber) u.frozen = false;
  }
  events.push({ t: 'endturn', p });
  startTurn(s, 1 - p, events);
}

// ---------------------------------------------------------------- actions
export function applyAction(s, p, a) {
  const events = [];
  const fail = (error) => ({ ok: false, error, events: [] });
  if (s.winner !== null) return fail('The game is over.');
  if (a.type === 'concede') {
    s.players[p].hp = 0;
    events.push({ t: 'concede', p });
    cleanup(s, events);
    return { ok: true, events };
  }
  if (s.turn !== p) return fail('It is not your turn.');
  const P = s.players[p];

  if (a.type === 'end') {
    endTurn(s, p, events);
    return { ok: true, events };
  }

  if (a.type === 'play') {
    const hi = P.hand.findIndex((c) => c.uid === a.uid);
    if (hi < 0) return fail('Card not in hand.');
    const hc = P.hand[hi];
    const card = CARDS[hc.id];
    if (card.cost > P.mana) return fail('Not enough runes.');
    if (card.type === 'unit') {
      let slot = Number.isInteger(a.slot) ? a.slot : P.board.findIndex((x) => !x);
      if (slot < 0 || slot >= BOARD_SIZE || P.board[slot]) return fail('That spot is taken.');
      P.mana -= card.cost;
      P.hand.splice(hi, 1);
      P.board[slot] = makeUnit(s, hc.uid, hc.id);
      events.push({ t: 'summon', p, slot, uid: hc.uid, id: hc.id });
      for (const e of card.fx) runEffect(s, p, e, null, events);
    } else {
      let target = null;
      if (needsTarget(card)) {
        const legal = spellTargets(s, p, card);
        target = legal.find((t) => sameTarget(t, a.target));
        if (!target) return fail('Invalid target.');
      }
      P.mana -= card.cost;
      P.hand.splice(hi, 1);
      events.push({ t: 'cast', p, id: hc.id, uid: hc.uid, target: target ? tgtEv(s, target) : null });
      for (const e of card.fx) runEffect(s, p, e, target, events);
    }
    cleanup(s, events);
    return { ok: true, events };
  }

  if (a.type === 'attack') {
    const att = P.board[a.slot];
    const legal = attackTargets(s, p, a.slot);
    const target = legal.find((t) => sameTarget(t, a.target));
    if (!att || !target) return fail('Invalid attack.');
    att.attacked = true;
    events.push({ t: 'attack', p, slot: a.slot, uid: att.uid, target: tgtEv(s, target) });
    const venom = att.kw.includes('venom');
    if (target.kind === 'hero') {
      const dealt = damage(s, target, att.atk, events);
      if (att.kw.includes('vampyric')) healHero(s, p, dealt, events);
    } else {
      const def = getUnit(s, target);
      const mA = attackMultiplier(att, def), mD = attackMultiplier(def, att);
      const dA = att.atk * mA, dD = def.atk * mD;
      const dealtA = damage(s, target, dA, events, { venom, adv: mA > 1 });
      const dealtD = damage(s, unitTarget(p, a.slot), dD, events, { venom: def.kw.includes('venom'), adv: mD > 1 });
      if (att.kw.includes('vampyric')) healHero(s, p, dealtA, events);
      if (def.kw.includes('vampyric')) healHero(s, target.p, dealtD, events);
    }
    cleanup(s, events);
    return { ok: true, events };
  }
  return fail('Unknown action.');
}

// Snapshot that hides the opponent's hand and both decks.
export function viewFor(s, me) {
  return {
    me,
    turn: s.turn,
    turnNumber: s.turnNumber,
    winner: s.winner,
    timeLeft: s.turnStartedAt ? Math.max(0, TURN_SECONDS * 1000 - (Date.now() - s.turnStartedAt)) : null,
    players: s.players.map((P, i) => ({
      name: P.name, avatar: P.avatar, hp: P.hp, maxHp: P.maxHp, mana: P.mana, maxMana: P.maxMana,
      fatigue: P.fatigue, deckCount: P.deck.length, handCount: P.hand.length,
      hand: i === me ? P.hand.map((c) => ({ ...c })) : null,
      board: P.board.map((u) => (u ? { ...u, kw: u.kw.slice() } : null)),
    })),
  };
}

// Strip private info from events for a given viewer.
export function eventsFor(events, me) {
  return events.map((e) => {
    if ((e.t === 'draw' || e.t === 'burn') && e.p !== me) return { t: e.t, p: e.p };
    return e;
  });
}
