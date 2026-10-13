// App controller: menus, game flow (AI / host / guest), HUD and chat.
import { CARDS, KEYWORDS, STYLES } from './cards.js';
import { createGame, applyAction, viewFor, eventsFor, TURN_SECONDS } from './game.js';
import { aiNextAction } from './ai.js';
import { drawCard, portraitCanvas, loadModels, iconCanvas, setArtMode } from './cardArt.js';
import { loadWikiArt, wikiCount } from './wikiArt.js';
import { Net } from './net.js';
import { AVATARS } from './avatar.js';
import { sfx, startAmbience, setMuted, isMuted } from './audio.js';

const $ = (s) => document.querySelector(s);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const store = {
  get(k, d) { try { return localStorage.getItem(k) ?? d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
};

const AI_NAMES = ['Sir Amik Varze', 'Duke Horacio', 'Doric', 'Father Aereck', 'Aggie the Witch', 'Wizard Mizgog', 'Thurgo', 'Sir Vyvin', 'Gertrude', 'Squire Asrol'];
const AI_LINES = {
  start: ['Good luck, adventurer!', 'gl hf', 'Prepare to see Lumbridge!', 'Another challenger at the Rising Sun!'],
  kill: ['Sit.', 'ez', 'Get rekt', 'Back to Lumbridge with you!'],
  lost: ['rip', 'Nooo!', 'lag!!', 'That was my best monster...'],
  low: ['Teleport! Teleport!', 'I was lagging', 'Eat! Eat!'],
  win: ['gf', 'Sit.', 'gg', 'Better luck next time.'],
  lose: ['gf', 'gg wp', 'Rematch?', 'My cat could have played better.'],
};
const pick = (a) => a[Math.floor(Math.random() * a.length)];

const app = {
  mode: null, // 'ai' | 'host' | 'guest'
  game: null, // authoritative state (ai/host only)
  me: 0,
  view: null,
  net: null,
  chain: Promise.resolve(),
  aiBusy: false,
  turnTimer: null,
  deadline: null,
  shownHp: [30, 30],
  rematch: { me: false, them: false },
  myName: store.get('gg-name', 'Adventurer'),
  myAvatar: store.get('gg-avatar', 'knight'),
  oppName: '',
};

let scene = null;

// ------------------------------------------------------------------ boot
async function boot() {
  try { await Promise.race([Promise.all([document.fonts.load('700 20px "Pixelify Sans"'), document.fonts.load('400 20px "Pixelify Sans"'), document.fonts.load('600 20px "Pixelify Sans"')]), wait(2500)]); } catch (e) { /* fall back */ }
  await loadModels();
  app.artMode = store.get('gg-art', 'wiki');
  setArtMode(app.artMode);
  if (app.artMode === 'wiki') {
    $('#loading p').textContent = 'Fetching pictures from the OSRS Wiki...';
    await loadWikiArt({ onProgress: (d, n) => ($('#loading p').textContent = `Fetching pictures from the OSRS Wiki... ${d}/${n}`) });
    setArtMode('wiki');
  }
  const { DuelScene } = await import('./scene.js');
  scene = new DuelScene($('#stage'), $('#overlay'), {
    onAction: (a) => submitLocal(a),
    onHover: showPreview,
    onPrompt: setPrompt,
    onView: updateHud,
    onTurn: (mine) => { banner(mine ? 'Your Turn' : `${app.oppName}'s Turn`, mine ? 'gold' : 'red'); if (app.mode === 'ai' && !mine) aiThinkLook(); },
    onReveal: reveal,
    onHeroHit: heroHit,
    onOverhead: placeOverhead,
    onLog: (m) => chatLine('game', m),
    onMenu: showMenu,
    onExamine: (id, who) => chatLine('game', id ? (CARDS[id].flavor || CARDS[id].name) : `It's ${who}, a fellow adventurer.`),
    onEndTurn: () => $('#btn-end').click(),
  });
  window.__scene = scene;
  scene.setPlayers('knight', pick(Object.keys(AVATARS)));
  scene.menuMode = true;
  menuCamera();
  $('#loading').classList.add('hidden');
  setupMenu();
  setupHud();
  if (window.GG_OFFLINE) {
    $('#btn-host').classList.add('hidden');
    document.querySelector('.join-row').classList.add('hidden');
    $('#menu-error').className = 'note';
    $('#menu-error').textContent = 'This preview is vs computer only. Online 1v1 needs the full version.';
  }
  const join = new URLSearchParams(location.search).get('join');
  if (join) { $('#join-code').value = join.toUpperCase(); }
}

function menuCamera() {
  const t0 = performance.now();
  const step = () => {
    if (!scene.menuMode) return;
    const t = (performance.now() - t0) / 1000;
    scene.look.ty = Math.sin(t * 0.08) * 1.1;
    scene.look.tp = -0.25 + Math.sin(t * 0.13) * 0.12;
    requestAnimationFrame(step);
  };
  step();
}

// ------------------------------------------------------------------ menu
function setupMenu() {
  $('#name').value = app.myName;
  const av = $('#avatars');
  for (const [id, a] of Object.entries(AVATARS)) {
    const b = document.createElement('button');
    b.className = 'avatar-choice' + (id === app.myAvatar ? ' selected' : '');
    b.dataset.id = id;
    b.innerHTML = `<b>${a.name}</b><small>${a.desc}</small>`;
    b.prepend(portraitCanvas(id));
    b.onclick = () => { app.myAvatar = id; store.set('gg-avatar', id); av.querySelectorAll('.avatar-choice').forEach((x) => x.classList.toggle('selected', x.dataset.id === id)); sfx('pick'); };
    av.appendChild(b);
  }
  $('#name').addEventListener('input', () => { app.myName = cleanName($('#name').value); store.set('gg-name', app.myName); });
  $('#btn-ai').onclick = () => { unlockAudio(); startAI(); };
  $('#btn-host').onclick = () => { unlockAudio(); startHost(); };
  $('#btn-join').onclick = () => { unlockAudio(); startJoin($('#join-code').value); };
  $('#join-code').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#btn-join').click(); });
  const artBtn = $('#btn-art');
  const showArt = () => {
    const n = wikiCount();
    artBtn.textContent = app.artMode === 'wiki' ? 'Card art: OSRS Wiki pictures' : 'Card art: pixel models';
    $('#art-status').textContent = app.artMode !== 'wiki' ? '' : n ? `${n} official pictures loaded from oldschool.runescape.wiki` : 'Could not reach the OSRS Wiki, so cards use pixel models.';
  };
  showArt();
  artBtn.onclick = async () => {
    app.artMode = app.artMode === 'wiki' ? 'models' : 'wiki';
    store.set('gg-art', app.artMode);
    if (app.artMode === 'wiki' && !wikiCount()) { artBtn.textContent = 'Fetching pictures...'; await loadWikiArt(); }
    setArtMode(app.artMode);
    $('#codex-grid').innerHTML = '';
    showArt();
  };
  $('#btn-howto').onclick = () => openModal('#howto');
  $('#btn-codex').onclick = () => { buildCodex(); openModal('#codex'); };
  document.querySelectorAll('[data-close]').forEach((b) => (b.onclick = () => b.closest('.modal').classList.add('hidden')));
  $('#btn-cancel-wait').onclick = () => { leaveGame(); };
  $('#btn-copy').onclick = () => { navigator.clipboard && navigator.clipboard.writeText($('#invite-link').value); $('#btn-copy').textContent = 'Copied!'; setTimeout(() => ($('#btn-copy').textContent = 'Copy link'), 1500); };
}

function cleanName(n) { return (n || '').replace(/[^\w \-']/g, '').trim().slice(0, 12) || 'Adventurer'; }
function unlockAudio() { startAmbience(); }
function openModal(sel) { $(sel).classList.remove('hidden'); }

function buildCodex() {
  const grid = $('#codex-grid');
  if (grid.childElementCount) return;
  const ids = Object.keys(CARDS).sort((a, b) => CARDS[a].cost - CARDS[b].cost || CARDS[a].name.localeCompare(CARDS[b].name));
  for (const id of ids) { const c = document.createElement('canvas'); drawCard(c, id); grid.appendChild(c); }
}

function showScreen(name) {
  $('#menu').classList.toggle('hidden', name !== 'menu');
  $('#waiting').classList.toggle('hidden', name !== 'waiting');
  document.body.classList.toggle('in-game', name === 'game');
  if (name === 'game') { scene.menuMode = false; scene.resetLook(); }
  if (name === 'menu') { scene.menuMode = true; menuCamera(); }
}

// ------------------------------------------------------------------ game flow
function resetForGame() {
  app.chain = Promise.resolve();
  app.view = null; scene.view = null;
  app.rematch = { me: false, them: false };
  $('#gameover').classList.add('hidden');
  $('#chat-log').innerHTML = '';
  clearTimeout(app.turnTimer);
  scene.clearBoard();
}

function startAI() {
  resetForGame();
  app.mode = 'ai'; app.me = 0;
  app.oppName = pick(AI_NAMES);
  const oppAvatar = pick(Object.keys(AVATARS));
  const { state, events } = createGame({ name: app.myName, avatar: app.myAvatar }, { name: app.oppName, avatar: oppAvatar });
  app.game = state;
  scene.setPlayers(app.myAvatar, oppAvatar);
  showScreen('game');
  chatLine('game', 'Welcome to the Rising Sun Inn. Reduce your opponent to 0 Hitpoints to win!');
  distribute(events, true);
  setTimeout(() => oppSay(pick(AI_LINES.start)), 1200);
}

function startHost() {
  resetForGame();
  app.mode = 'host'; app.me = 0;
  app.net = new Net(netHandlers());
  $('#wait-title').textContent = 'Opening a table...';
  $('#room-code').textContent = '·····';
  $('#invite').classList.add('hidden');
  $('#wait-error').textContent = '';
  showScreen('waiting');
  app.net.host((code) => {
    $('#wait-title').textContent = 'Waiting for a challenger';
    $('#room-code').textContent = code;
    const url = new URL(location.href); url.searchParams.set('join', code);
    $('#invite-link').value = url.toString();
    $('#invite').classList.remove('hidden');
  });
}

function startJoin(code) {
  code = (code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length < 4) { $('#menu-error').textContent = 'Enter the room code your friend gave you.'; return; }
  resetForGame();
  app.mode = 'guest';
  app.net = new Net(netHandlers());
  $('#wait-title').textContent = `Joining table ${code}...`;
  $('#room-code').textContent = code;
  $('#invite').classList.add('hidden');
  $('#wait-error').textContent = '';
  showScreen('waiting');
  app.net.join(code);
}

function netHandlers() {
  return {
    onOpen: () => {
      if (app.mode === 'guest') app.net.send({ t: 'hello', name: app.myName, avatar: app.myAvatar });
    },
    onData: (d) => onNet(d),
    onClose: () => {
      if (!app.mode || app.mode === 'ai') return;
      chatLine('game', `${app.oppName || 'Your opponent'} has left the tavern.`);
      if (app.view && app.view.winner === null) showGameOver(null, 'Your opponent disconnected.');
      else if (!app.view) { $('#wait-error').textContent = 'Connection closed.'; }
      clearTimeout(app.turnTimer);
    },
    onError: (msg) => {
      if (document.body.classList.contains('in-game')) chatLine('game', msg);
      else $('#wait-error').textContent = msg;
    },
  };
}

function onNet(d) {
  if (!d || typeof d !== 'object') return;
  switch (d.t) {
    case 'hello': // host receives guest
      if (app.mode !== 'host' || app.game) return;
      app.oppName = cleanName(d.name);
      newHostGame(AVATARS[d.avatar] ? d.avatar : 'knight');
      break;
    case 'start': // guest
      app.me = d.view.me; app.oppName = d.view.players[1 - d.view.me].name;
      resetForGame();
      scene.setPlayers(d.view.players[app.me].avatar, d.view.players[1 - app.me].avatar);
      showScreen('game');
      chatLine('game', `You sit down opposite ${app.oppName}. Good luck!`);
      enqueueView(d.view, d.events);
      break;
    case 'state': enqueueView(d.view, d.events); break;
    case 'action':
      if (app.mode === 'host' && app.game) {
        const r = applyAction(app.game, 1, d.a);
        if (!r.ok) app.net.send({ t: 'error', msg: r.error });
        else distribute(r.events);
      }
      break;
    case 'error': setPrompt(d.msg); break;
    case 'look': scene.setOppLook(+d.yaw || 0, +d.pitch || 0); break;
    case 'chat': oppSay(String(d.text || '').slice(0, 80)); break;
    case 'rematch':
      app.rematch.them = true;
      chatLine('game', `${app.oppName} wants a rematch!`);
      $('#btn-rematch').textContent = app.rematch.me ? 'Waiting...' : 'Accept Rematch';
      tryRematch();
      break;
    case 'full': $('#wait-error').textContent = 'That table already has two players.'; break;
    default: break;
  }
}

function newHostGame(guestAvatar) {
  const { state, events } = createGame({ name: app.myName, avatar: app.myAvatar }, { name: app.oppName, avatar: guestAvatar });
  app.game = state;
  resetForGame();
  scene.setPlayers(app.myAvatar, guestAvatar);
  showScreen('game');
  chatLine('game', `${app.oppName} sits down at your table. Good luck!`);
  app.net.send({ t: 'start', view: viewFor(state, 1), events: eventsFor(events, 1) });
  distribute(events, true, true);
}

function tryRematch() {
  if (!(app.rematch.me && app.rematch.them)) return;
  if (app.mode === 'host') {
    const guestAvatar = app.game.players[1].avatar;
    app.game = null;
    newHostGame(guestAvatar);
  }
}

// Authoritative side: push the new state to everyone.
function distribute(events, initial = false, skipNet = false) {
  const g = app.game;
  logEvents(events, g);
  enqueueView(viewFor(g, app.me), eventsFor(events, app.me), initial);
  if (app.mode === 'host' && !skipNet) app.net.send({ t: 'state', view: viewFor(g, 1), events: eventsFor(events, 1) });
  if (app.mode === 'host') armTurnTimer();
  if (app.mode === 'ai' && g.winner === null && g.turn === 1) aiLoop();
}

function enqueueView(view, events, initial = false) {
  if (app.mode === 'guest') logEvents(events, view);
  app.deadline = view.timeLeft != null && app.mode !== 'ai' ? performance.now() + view.timeLeft : null;
  app.chain = app.chain.then(async () => {
    await scene.applyView(view, initial ? [] : events);
    app.view = view;
    updateHud(view);
    if (view.winner !== null) onWinner(view);
  }).catch((e) => console.error(e));
}

function submitLocal(a) {
  if (app.mode === 'guest') { app.net.send({ t: 'action', a }); return; }
  if (!app.game) return;
  const r = applyAction(app.game, app.me, a);
  if (!r.ok) { setPrompt(r.error); return; }
  distribute(r.events);
}

function armTurnTimer() {
  clearTimeout(app.turnTimer);
  const g = app.game;
  if (!g || g.winner !== null) return;
  const left = TURN_SECONDS * 1000 - (Date.now() - g.turnStartedAt);
  const turnNo = g.turnNumber;
  app.turnTimer = setTimeout(() => {
    if (app.game === g && g.turnNumber === turnNo && g.winner === null) {
      const r = applyAction(g, g.turn, { type: 'end' });
      if (r.ok) { chatLine('game', 'Time ran out! The turn passes.'); distribute(r.events); }
    }
  }, Math.max(0, left) + 1500);
}

// ------------------------------------------------------------------ AI
async function aiLoop() {
  if (app.aiBusy) return;
  app.aiBusy = true;
  const g = app.game;
  try {
    while (app.game === g && g.winner === null && g.turn === 1) {
      await app.chain;
      await wait(650 + Math.random() * 650);
      if (app.game !== g) break;
      const a = aiNextAction(g, 1);
      if (a.type === 'attack') { scene.oppLookAtTarget(a.target); await wait(450); }
      else if (a.type === 'play') { scene.oppLookAtPoint(scene.opp.fan.getWorldPosition(scene.opp.fan.position.clone())); await wait(300); }
      else { scene.oppLookAtPlayer(); await wait(300); }
      const before = g.players.map((p) => p.board.filter(Boolean).length);
      const r = applyAction(g, 1, a);
      if (!r.ok) { console.warn('AI action failed', r.error, a); applyAction(g, 1, { type: 'end' }); break; }
      distributeNoAi(r.events);
      aiBanter(r.events, before);
    }
  } finally { app.aiBusy = false; }
  scene.oppLookAtPlayer();
}

function distributeNoAi(events) {
  logEvents(events, app.game);
  enqueueView(viewFor(app.game, app.me), eventsFor(events, app.me));
}

function aiThinkLook() {
  setTimeout(() => scene.oppLookAtPoint(scene.slotPos('opp', Math.floor(Math.random() * 5))), 500);
}

function aiBanter(events, before) {
  const g = app.game;
  const deaths = events.filter((e) => e.t === 'die');
  if (deaths.some((e) => e.p === 0) && Math.random() < 0.35) oppSay(pick(AI_LINES.kill));
  else if (deaths.some((e) => e.p === 1) && Math.random() < 0.3) oppSay(pick(AI_LINES.lost));
  else if (g.players[1].hp <= 8 && Math.random() < 0.12) oppSay(pick(AI_LINES.low));
  void before;
}

// ------------------------------------------------------------------ HUD
function setupHud() {
  $('#btn-end').onclick = () => {
    if (!app.view || app.view.turn !== app.me || app.view.winner !== null || scene.busy) return;
    scene.cancel();
    submitLocal({ type: 'end' });
  };
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    if ((e.key === 'Enter' || e.key === 'e' || e.key === 'E') && document.body.classList.contains('in-game')) $('#btn-end').click();
  });
  $('#btn-sound').onclick = () => { setMuted(!isMuted()); $('#btn-sound').classList.toggle('off', isMuted()); };
  $('#btn-rules').onclick = () => openModal('#howto');
  let leaveArmed = 0;
  $('#btn-leave').onclick = () => {
    const live = app.view && app.view.winner === null;
    if (live && Date.now() - leaveArmed > 3000) {
      leaveArmed = Date.now();
      $('#btn-leave').textContent = 'Concede?';
      setTimeout(() => ($('#btn-leave').textContent = 'Leave'), 3000);
      return;
    }
    $('#btn-leave').textContent = 'Leave';
    if (live) submitLocal({ type: 'concede' });
    setTimeout(leaveGame, 200);
  };
  $('#btn-rematch').onclick = () => {
    if (app.mode === 'ai') { startAI(); return; }
    if (!app.net || !app.net.conn || !app.net.conn.open) { leaveGame(); return; }
    app.rematch.me = true; app.net.send({ t: 'rematch' });
    $('#btn-rematch').textContent = 'Waiting...';
    tryRematch();
  };
  $('#btn-menu').onclick = leaveGame;
  // OSRS orb icons
  for (const [sel, name] of [['.hp-orb', 'hp'], ['.rune-orb', 'rune']]) document.querySelectorAll(sel).forEach((orb) => {
    const src = iconCanvas(name), c = document.createElement('canvas');
    c.width = src.width; c.height = src.height; c.getContext('2d').drawImage(src, 0, 0); orb.appendChild(c);
  });
  document.addEventListener('pointerdown', (e) => { if (!e.target.closest('#osmenu') && e.target.tagName !== 'CANVAS') showMenu(null); });
  // chat tabs + phone chat toggle
  document.querySelectorAll('#chat-tabs button').forEach((b) => (b.onclick = () => {
    document.querySelectorAll('#chat-tabs button').forEach((x) => x.classList.toggle('on', x === b));
    document.body.classList.toggle('chat-game', b.dataset.tab === 'game');
    document.body.classList.toggle('chat-public', b.dataset.tab === 'public');
  }));
  $('#btn-chat').onclick = () => { document.body.classList.toggle('chat-open'); $('#btn-chat').classList.remove('unread'); const log = $('#chat-log'); log.scrollTop = log.scrollHeight; };
  // chat
  const QUICK = ['gl hf', 'gz!', 'Pray mage!', 'lol', 'Buying gf 10k', 'Sit.', 'wave:gf', 'Selling lobbies'];
  const q = $('#quick-chat');
  for (const line of QUICK) { const b = document.createElement('button'); b.textContent = line.replace(/^\w+:/, ''); b.onclick = () => sendChat(line); q.appendChild(b); }
  $('#chat-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { sendChat($('#chat-input').value); $('#chat-input').value = ''; $('#chat-input').blur(); }
    e.stopPropagation();
  });
  // turn timer display
  setInterval(() => {
    const el = $('#timer');
    if (!app.view || app.deadline == null || app.view.winner !== null) { el.textContent = ''; return; }
    const s = Math.max(0, Math.ceil((app.deadline - performance.now()) / 1000));
    el.textContent = s <= 20 ? `${s}s` : '';
    el.classList.toggle('urgent', s <= 10);
  }, 250);
  // look sync for online play
  let lastLook = '';
  setInterval(() => {
    if (!app.net || (app.mode !== 'host' && app.mode !== 'guest')) return;
    const l = scene.getLook(); const k = `${l.yaw},${l.pitch}`;
    if (k !== lastLook) { lastLook = k; app.net.send({ t: 'look', ...l }); }
  }, 120);
}

function updateHud(view) {
  if (!view) return;
  const me = view.players[view.me], opp = view.players[1 - view.me];
  const fill = (root, P, isMe) => {
    root.querySelector('.name').textContent = P.name;
    setHpNum(root.querySelector('.hp-val'), P.hp, P.maxHp);
    root.querySelector('.hp-orb').style.setProperty('--fill', `${Math.max(0, P.hp / P.maxHp) * 100}%`);
    const rv = root.querySelector('.rune-val');
    rv.textContent = P.mana; rv.style.color = P.mana > 0 ? 'var(--green)' : 'var(--red)';
    root.querySelector('.rune-orb').style.setProperty('--fill', `${P.maxMana ? (P.mana / P.maxMana) * 100 : 0}%`);
    root.querySelector('.cards').textContent = `${isMe ? P.hand.length : P.handCount} cards · ${P.deckCount} deck · ${P.mana}/${P.maxMana} runes`;
    root.classList.toggle('active', view.turn === (isMe ? view.me : 1 - view.me) && view.winner === null);
  };
  fill($('#hud-me'), me, true);
  fill($('#hud-opp'), opp, false);
  app.shownHp = [me.hp, opp.hp];
  const myTurn = view.turn === view.me && view.winner === null;
  const btn = $('#btn-end');
  btn.disabled = !myTurn;
  btn.textContent = myTurn ? 'End Turn' : 'Opponent\'s Turn';
  // nothing left to do? make the button pulse
  const anyPlay = myTurn && (me.hand.some((c) => CARDS[c.id].cost <= me.mana) || me.board.some((u) => u && !u.attacked && !u.frozen && u.atk > 0 && (!u.sick || u.kw.includes('charge'))));
  btn.classList.toggle('pulse', myTurn && !anyPlay);
  $('#ov-name').textContent = opp.name;
  $('#ov-hp').style.width = `${Math.max(0, opp.hp / opp.maxHp) * 100}%`;
  if (myTurn && !scene.selection) setPrompt(view.turnNumber <= 2 && !me.board.some(Boolean) ? 'Your turn! Click a glowing card to play it, then pick a spot on the table.' : '');
}

function heroHit(side, n) {
  const i = side === 'me' ? 0 : 1;
  app.shownHp[i] -= n;
  const root = side === 'me' ? $('#hud-me') : $('#hud-opp');
  const max = app.view ? app.view.players[side === 'me' ? app.view.me : 1 - app.view.me].maxHp : 30;
  setHpNum(root.querySelector('.hp-val'), app.shownHp[i], max);
  root.classList.remove('hit'); void root.offsetWidth; root.classList.add('hit');
  if (side === 'me') { const h = $('#hurt'); h.classList.remove('on'); void h.offsetWidth; h.classList.add('on'); }
  else { const ov = $('#ov-hp'); const v = app.view && app.view.players[1 - app.view.me]; if (v) ov.style.width = `${Math.max(0, app.shownHp[1] / v.maxHp) * 100}%`; }
}

// OSRS orb numbers go green -> yellow -> orange -> red as they drop
function setHpNum(el, hp, max) {
  const f = Math.max(0, hp) / max;
  el.textContent = Math.max(0, hp);
  el.style.color = f > 0.75 ? 'var(--green)' : f > 0.5 ? 'var(--yellow)' : f > 0.25 ? 'var(--orange)' : 'var(--red)';
}

function showMenu(m) {
  const el = $('#osmenu');
  if (!m) { el.classList.add('hidden'); return; }
  el.innerHTML = '<div class="head">Choose Option</div>';
  for (const o of m.opts) {
    const b = document.createElement('button');
    b.innerHTML = o.html;
    b.onclick = (e) => { e.stopPropagation(); el.classList.add('hidden'); o.run(); };
    el.appendChild(b);
  }
  el.classList.remove('hidden');
  const w = el.offsetWidth, h = el.offsetHeight;
  el.style.left = `${Math.max(4, Math.min(window.innerWidth - w - 4, m.x - w / 2))}px`;
  el.style.top = `${Math.max(4, Math.min(window.innerHeight - h - 4, m.y - 8))}px`;
}

function placeOverhead(p) {
  const el = $('#overhead');
  if (!document.body.classList.contains('in-game') || !p.vis) { el.style.display = 'none'; return; }
  el.style.display = '';
  el.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -100%)`;
}

function setPrompt(text) {
  const el = $('#prompt');
  el.textContent = text || '';
  el.classList.toggle('hidden', !text);
}

let bannerTimer = null;
function banner(text, kind) {
  const el = $('#banner');
  el.textContent = text; el.className = `show ${kind}`;
  clearTimeout(bannerTimer); bannerTimer = setTimeout(() => (el.className = ''), 1400);
}

let revealTimer = null;
function reveal(id) {
  const el = $('#reveal');
  const c = el.querySelector('canvas'); drawCard(c, id);
  el.querySelector('.who').textContent = `${app.oppName} played`;
  el.classList.add('show');
  clearTimeout(revealTimer); revealTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

function showPreview(info) {
  const el = $('#preview');
  if (!info) { el.classList.remove('show'); return; }
  const card = CARDS[info.cardId];
  drawCard(el.querySelector('canvas'), info.cardId);
  const lines = [];
  if (info.unit) {
    const u = info.unit;
    lines.push(`<div class="stat"><b>${info.enemy ? 'Enemy' : 'Your'} monster</b> · Attack <b>${u.atk}</b> · Health <b>${u.hp}/${u.maxHp}</b></div>`);
    if (u.frozen) lines.push('<div class="status frozen">❄ Frozen: can\'t attack this turn.</div>');
    else if (!info.enemy && app.view && app.view.turn === app.view.me) {
      if (u.attacked) lines.push('<div class="status">Already attacked this turn.</div>');
      else if (u.sick && !u.kw.includes('charge')) lines.push('<div class="status">Just arrived: can attack next turn.</div>');
      else if (u.atk > 0) lines.push('<div class="status ready">Ready! Click it, then click a target.</div>');
    }
    for (const k of u.kw) if (!card.kw.includes(k)) lines.push(`<div class="kw"><b>${KEYWORDS[k].name}</b> (equipped): ${KEYWORDS[k].text}</div>`);
  }
  for (const k of card.kw) lines.push(`<div class="kw"><b>${KEYWORDS[k].name}:</b> ${KEYWORDS[k].text}</div>`);
  if (card.type === 'unit') {
    const st = card.style;
    if (st === 'all') lines.push('<div class="tri">Uses <b>all</b> styles: deals ×2 damage to every monster.</div>');
    else {
      const beats = STYLES[STYLES[st].beats].name;
      const loses = Object.values(STYLES).find((s) => s.beats === st).name;
      lines.push(`<div class="tri"><span style="color:${STYLES[st].color}">${STYLES[st].name}</span> deals <b>×2</b> to ${beats} monsters, but takes <b>×2</b> from ${loses}.</div>`);
    }
  }
  el.querySelector('.info').innerHTML = lines.join('');
  el.classList.add('show');
}

// ------------------------------------------------------------------ chat
function formatChat(text) {
  const m = text.match(/^((?:yellow|red|green|cyan|purple|white|flash1|glow1):)?((?:wave|shake|scroll):)?(.*)$/i);
  let color = 'yellow', fx = '';
  let body = text;
  if (m) { if (m[1]) color = m[1].slice(0, -1).toLowerCase(); if (m[2]) fx = m[2].slice(0, -1).toLowerCase(); body = m[3]; }
  const esc = body.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const inner = fx === 'wave' ? [...esc].map((ch, i) => `<i style="animation-delay:${i * 0.06}s">${ch === ' ' ? '&nbsp;' : ch}</i>`).join('') : esc;
  return { html: `<span class="ct ${color} ${fx}">${inner}</span>`, plain: esc };
}

function sendChat(text) {
  text = (text || '').trim().slice(0, 80);
  if (!text) return;
  const f = formatChat(text);
  chatLine('me', f.plain, app.myName);
  if (app.net) app.net.send({ t: 'chat', text });
  sfx('chat');
}

function oppSay(text) {
  const f = formatChat(text);
  chatLine('opp', f.plain, app.oppName);
  const el = $('#ov-chat');
  el.innerHTML = f.html;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  clearTimeout(oppSay.t); oppSay.t = setTimeout(() => el.classList.remove('show'), 4500);
  sfx('chat');
}

function chatLine(kind, text, who) {
  const log = $('#chat-log');
  const div = document.createElement('div');
  div.className = `line ${kind}`;
  div.innerHTML = who ? `<b>${who}:</b> <span>${text}</span>` : text;
  log.appendChild(div);
  while (log.childElementCount > 80) log.firstChild.remove();
  log.scrollTop = log.scrollHeight;
  if (kind === 'opp' && !document.body.classList.contains('chat-open')) $('#btn-chat').classList.add('unread');
}

function logEvents(events, s) {
  const me = app.me;
  const nameOf = (p) => (p === me ? 'You' : app.oppName);
  const unitName = (t) => { if (!t) return ''; if (t.kind === 'hero') return t.p === me ? 'you' : app.oppName; const u = s.players[t.p].board[t.slot]; return u ? CARDS[u.id].name : 'a monster'; };
  for (const e of events) {
    if (e.t === 'summon') chatLine('game', `${nameOf(e.p)} summoned <b>${CARDS[e.id].name}</b>.`);
    else if (e.t === 'cast') chatLine('game', `${nameOf(e.p)} used <b>${CARDS[e.id].name}</b>${e.target ? ` on ${e.target.kind === 'hero' ? (e.target.p === me ? 'you' : app.oppName) : 'a monster'}` : ''}.`);
    else if (e.t === 'dmg' && e.adv) chatLine('game', '<span class="adv">Combat advantage! Double damage!</span>');
    else if (e.t === 'die') chatLine('game', `${CARDS[e.id].name} has been slain.`);
    else if (e.t === 'freeze') chatLine('game', `${unitName(e.target)} is frozen solid!`);
    else if (e.t === 'turn' && e.p === me) chatLine('game', `— Turn ${Math.ceil(e.n / 2)}: your move. —`);
  }
}

// ------------------------------------------------------------------ end of game
function onWinner(view) {
  if (onWinner.shown === view) return;
  const w = view.winner;
  if (w === 'draw') showGameOver('draw');
  else showGameOver(w === view.me ? 'win' : 'lose');
}

function showGameOver(result, reason) {
  clearTimeout(app.turnTimer);
  const el = $('#gameover');
  const title = el.querySelector('h2'), sub = el.querySelector('p');
  if (result === 'win') { title.textContent = 'Victory!'; sub.textContent = reason || `${app.oppName} has been defeated. Oh dear, they are dead!`; sfx('win'); }
  else if (result === 'lose') { title.textContent = 'Oh dear, you are dead!'; sub.textContent = reason || `${app.oppName} wins this duel.`; sfx('lose'); }
  else if (result === 'draw') { title.textContent = 'A Draw!'; sub.textContent = 'Both duellists fell at once.'; }
  else { title.textContent = 'Duel Over'; sub.textContent = reason || ''; }
  el.className = `modal ${result || 'neutral'}`;
  $('#btn-rematch').textContent = app.mode === 'ai' ? 'Play Again' : app.rematch.them ? 'Accept Rematch' : 'Rematch';
  $('#btn-rematch').classList.toggle('hidden', result === null);
  if (app.mode === 'ai' && result) setTimeout(() => oppSay(pick(result === 'win' ? AI_LINES.lose : AI_LINES.win)), 600);
  setTimeout(() => el.classList.remove('hidden'), 900);
}

function leaveGame() {
  clearTimeout(app.turnTimer);
  if (app.net) { app.net.close(); app.net = null; }
  app.mode = null; app.game = null; app.view = null;
  scene.clearBoard(); scene.view = null;
  $('#gameover').classList.add('hidden');
  $('#overhead').style.display = 'none';
  setPrompt('');
  showScreen('menu');
}

boot();
