// Simple greedy AI: play the best affordable cards, make good trades, go face.
import { CARDS, hasAdvantage } from './cards.js';
import { canPlay, spellTargets, attackTargets, canUnitAttack } from './game.js';

const unitValue = (u) => u.atk * 1.2 + u.hp + (u.kw.includes('guard') ? 1 : 0) + (u.kw.includes('venom') ? 3 : 0);

function bestSpellTarget(s, p, card) {
  const targets = spellTargets(s, p, card);
  const fx = card.fx[0];
  const enemy = 1 - p;
  const unitOf = (t) => s.players[t.p].board[t.slot];
  const enemyUnits = targets.filter((t) => t.kind === 'unit' && t.p === enemy);
  const friendly = targets.filter((t) => t.kind === 'unit' && t.p === p);
  if (fx.fx === 'dmg') {
    const heroT = targets.find((t) => t.kind === 'hero');
    if (heroT && s.players[enemy].hp <= fx.n) return heroT;
    const kills = enemyUnits.filter((t) => unitOf(t).hp <= fx.n);
    if (kills.length) return kills.sort((a, b) => unitValue(unitOf(b)) - unitValue(unitOf(a)))[0];
    if (card.fx.some((e) => e.fx === 'freeze') && enemyUnits.length) {
      return enemyUnits.sort((a, b) => unitOf(b).atk - unitOf(a).atk)[0];
    }
    if (heroT && s.players[p].hand.length > 6) return heroT;
    return null;
  }
  if (fx.fx === 'buff') {
    if (!friendly.length) return null;
    const pick = fx.kw === 'guard'
      ? friendly.filter((t) => !unitOf(t).kw.includes('guard')).sort((a, b) => unitOf(b).hp - unitOf(a).hp)[0]
      : fx.kw === 'venom'
        ? friendly.filter((t) => !unitOf(t).kw.includes('venom')).sort((a, b) => canUnitAttack(unitOf(b)) - canUnitAttack(unitOf(a)))[0]
        : friendly.sort((a, b) => (canUnitAttack(unitOf(b)) - canUnitAttack(unitOf(a))) || unitOf(b).atk - unitOf(a).atk)[0];
    return pick || null;
  }
  if (fx.fx === 'bounce') {
    const big = enemyUnits.filter((t) => CARDS[unitOf(t).id].cost >= 5);
    return big.sort((a, b) => CARDS[unitOf(b).id].cost - CARDS[unitOf(a).id].cost)[0] || null;
  }
  return targets[0] || null;
}

function shouldCastUntargeted(s, p, card) {
  const P = s.players[p];
  const enemyUnits = s.players[1 - p].board.filter(Boolean);
  const fx = card.fx[0].fx;
  if (fx === 'gainMana') return P.hand.some((c) => c.id !== 'coins' && CARDS[c.id].cost === P.mana + 1);
  if (fx === 'healHero') return P.maxHp - P.hp >= 6;
  if (fx === 'healAllFriendly') return P.maxHp - P.hp >= 4 || P.board.some((u) => u && u.maxHp - u.hp >= 3);
  if (fx === 'dmgAllEnemyUnits') return enemyUnits.length >= 2;
  return true;
}

export function aiNextAction(s, p) {
  const P = s.players[p];
  // 1. Play cards, most expensive first.
  const playable = P.hand.filter((c) => canPlay(s, p, c)).sort((a, b) => CARDS[b.id].cost - CARDS[a.id].cost);
  for (const hc of playable) {
    const card = CARDS[hc.id];
    if (card.type === 'unit') {
      // put guards in the middle-ish, others fill from the centre outwards
      const order = [2, 1, 3, 0, 4];
      const slot = order.find((i) => !P.board[i]);
      return { type: 'play', uid: hc.uid, slot };
    }
    if (card.target && card.target !== 'none') {
      const t = bestSpellTarget(s, p, card);
      if (t) return { type: 'play', uid: hc.uid, target: t };
    } else if (shouldCastUntargeted(s, p, card)) {
      return { type: 'play', uid: hc.uid };
    }
  }

  // 2. Attacks.
  const enemy = 1 - p;
  const E = s.players[enemy];
  const attackers = P.board.map((u, i) => ({ u, i })).filter((x) => canUnitAttack(x.u)).sort((a, b) => b.u.atk - a.u.atk);
  if (attackers.length) {
    const hasGuard = E.board.some((u) => u && u.kw.includes('guard'));
    const totalAtk = attackers.reduce((n, x) => n + x.u.atk, 0);
    for (const { u, i } of attackers) {
      const targets = attackTargets(s, p, i);
      const hero = targets.find((t) => t.kind === 'hero');
      if (hero && !hasGuard && totalAtk >= E.hp) return { type: 'attack', slot: i, target: hero };
      let best = null, bestScore = 0;
      for (const t of targets) {
        if (t.kind !== 'unit') continue;
        const d = E.board[t.slot];
        const dA = u.atk * (hasAdvantage(u.style, d.style) ? 2 : 1);
        const dD = d.atk * (hasAdvantage(d.style, u.style) ? 2 : 1);
        const kills = dA >= d.hp || (u.kw.includes('venom') && dA > 0);
        const dies = dD >= u.hp || (d.kw.includes('venom') && dD > 0);
        let score = 0;
        if (kills && !dies) score = unitValue(d) + 6;
        else if (kills && dies) score = unitValue(d) - unitValue(u) + 1.5;
        else if (!kills && !dies) score = hero ? -1 : 0.5;
        else score = hero ? -5 : -0.5;
        if (score > bestScore || (!hero && !best)) { best = t; bestScore = score; }
      }
      if (best && bestScore > 0) return { type: 'attack', slot: i, target: best };
      if (hero) return { type: 'attack', slot: i, target: hero };
      if (best) return { type: 'attack', slot: i, target: best };
    }
  }
  return { type: 'end' };
}
