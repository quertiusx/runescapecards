// Card definitions for Gielinor Gambit.
// Every monster has a combat style. The combat triangle:
//   Melee beats Ranged, Ranged beats Magic, Magic beats Melee.
// A monster attacking (or hitting back at) a monster it beats deals DOUBLE damage.

export const STYLES = {
  melee:  { name: 'Melee',  color: '#c0392b', beats: 'ranged', icon: 'sword' },
  ranged: { name: 'Ranged', color: '#3f9a35', beats: 'magic',  icon: 'bow' },
  magic:  { name: 'Magic',  color: '#3a6fd8', beats: 'melee',  icon: 'staff' },
  all:    { name: 'All Styles', color: '#d9a21b', beats: '*',  icon: 'all' },
};

export function hasAdvantage(attStyle, defStyle) {
  if (!attStyle || !defStyle) return false;
  if (attStyle === 'all') return defStyle !== 'all';
  return STYLES[attStyle].beats === defStyle;
}

export const KEYWORDS = {
  guard:    { name: 'Guard',    text: 'Enemies must attack this monster before anything else.' },
  charge:   { name: 'Charge',   text: 'Can attack on the turn it is played.' },
  venom:    { name: 'Venom',    text: 'Destroys any monster it damages.' },
  vampyric: { name: 'Vampyric', text: 'Damage this monster deals heals you.' },
  frozen:   { name: 'Frozen',   text: 'Cannot attack during its next turn.' },
};

// fx vocabulary (handled in game.js):
//  dmg n (chosen target)      | dmgRandomEnemyUnit n | dmgEnemyHero n
//  dmgAllEnemyUnits n         | dmgAllEnemies n      | draw n
//  healHero n                 | healAllFriendly      | buff atk hp kw
//  freeze (chosen)            | bounce (chosen)      | gainMana n
export const CARDS = {
  // ---------------- 1 cost ----------------
  chicken: {
    name: 'Chicken', type: 'unit', cost: 1, atk: 1, hp: 2, style: 'melee',
    flavor: 'Bok bok. Every legend starts by killing one of these.',
    art: { kind: 'chicken', bg: 'farm' },
  },
  goblin: {
    name: 'Goblin', type: 'unit', cost: 1, atk: 2, hp: 1, style: 'melee',
    flavor: 'Red or green? The goblins are still arguing.',
    art: { kind: 'humanoid', bg: 'lumbridge', skin: '#6f9a3a', body: '#7a5a32', head: 'none', ears: true, weapon: 'spear', scale: 0.85, angry: true },
  },
  hans: {
    name: 'Hans', type: 'unit', cost: 1, atk: 1, hp: 3, style: 'melee', kw: ['guard'],
    flavor: 'Has been pacing around Lumbridge Castle since the dawn of time.',
    art: { kind: 'humanoid', bg: 'castle', skin: '#e2b48c', body: '#47306e', head: 'hair', hair: '#5b3b1c' },
  },
  imp: {
    name: 'Imp', type: 'unit', cost: 1, atk: 1, hp: 1, style: 'magic', kw: ['charge'],
    flavor: 'It stole your beads. Then it teleported away.',
    art: { kind: 'imp', bg: 'lava' },
  },
  wind_strike: {
    name: 'Wind Strike', type: 'spell', sub: 'Spell', cost: 1, target: 'unit',
    fx: [{ fx: 'dmg', n: 2 }], text: 'Deal 2 damage to a monster.',
    flavor: 'Level 1 Magic. Still hits harder than a goblin.',
    art: { kind: 'orb', bg: 'arcane', color: '#e8f4ff', glow: '#9fd0ff' },
  },

  // ---------------- 2 cost ----------------
  dark_wizard: {
    name: 'Dark Wizard', type: 'unit', cost: 2, atk: 2, hp: 2, style: 'magic',
    fx: [{ fx: 'dmgRandomEnemyUnit', n: 1 }], text: 'When played: Deal 1 damage to a random enemy monster.',
    flavor: 'Lurks south of Varrock casting spells at passers-by.',
    art: { kind: 'humanoid', bg: 'wilderness', skin: '#d9ab84', body: '#1f1a24', trim: '#9e1b1b', head: 'hat', hat: '#2a2230', beard: '#3a3a3a', weapon: 'staff', orb: '#ff4040' },
  },
  gnome_archer: {
    name: 'Gnome Archer', type: 'unit', cost: 2, atk: 2, hp: 3, style: 'ranged',
    flavor: 'Small, but never misses a chance to say "Ugh!"',
    art: { kind: 'humanoid', bg: 'forest', skin: '#e0b088', body: '#3e7a2d', head: 'gnomehat', hat: '#2f6a2a', weapon: 'bow', scale: 0.8 },
  },
  al_kharid_warrior: {
    name: 'Al-Kharid Warrior', type: 'unit', cost: 2, atk: 3, hp: 2, style: 'melee',
    flavor: 'Guards the palace. Sometimes the palace needs guarding from him.',
    art: { kind: 'humanoid', bg: 'desert', skin: '#b5835a', body: '#e9e2cf', trim: '#a32020', head: 'turban', hat: '#efe6d0', weapon: 'scimitar', bladeColor: '#c9ced6' },
  },
  bob: {
    name: 'Bob the Cat', type: 'unit', cost: 2, atk: 2, hp: 2, style: 'melee', kw: ['charge'],
    flavor: 'He is not just a cat. He is THE cat.',
    art: { kind: 'cat', bg: 'tavern' },
  },
  shark: {
    name: 'Shark', type: 'spell', sub: 'Food', cost: 2, target: 'none',
    fx: [{ fx: 'healHero', n: 6 }], text: 'Restore 6 Hitpoints to yourself.',
    flavor: 'Cooked on a range, not a fire. You are not a noob.',
    art: { kind: 'shark', bg: 'sea' },
  },
  super_combat: {
    name: 'Super Combat Potion', type: 'spell', sub: 'Potion', cost: 2, target: 'friendlyUnit',
    fx: [{ fx: 'buff', atk: 2, hp: 2 }], text: 'Give a friendly monster +2 Attack and +2 Health.',
    flavor: 'Four doses of pure stats.',
    art: { kind: 'potion', bg: 'tavern', color: '#2f8f3a' },
  },
  rune_platebody: {
    name: 'Rune Platebody', type: 'spell', sub: 'Equipment', cost: 2, target: 'friendlyUnit',
    fx: [{ fx: 'buff', atk: 0, hp: 3, kw: 'guard' }], text: 'Give a friendly monster +3 Health and Guard.',
    flavor: 'Requires Dragon Slayer I. Worth it.',
    art: { kind: 'platebody', bg: 'castle', color: '#4c9bb0' },
  },
  dragon_dagger: {
    name: 'Dragon Dagger (p++)', type: 'spell', sub: 'Equipment', cost: 2, target: 'friendlyUnit',
    fx: [{ fx: 'buff', atk: 1, hp: 0, kw: 'venom' }], text: 'Give a friendly monster +1 Attack and Venom.',
    flavor: 'Spec, spec, switch.',
    art: { kind: 'dagger', bg: 'wilderness' },
  },

  // ---------------- 3 cost ----------------
  black_knight: {
    name: 'Black Knight', type: 'unit', cost: 3, atk: 2, hp: 5, style: 'melee', kw: ['guard'],
    flavor: 'Loyal to the fortress north of Falador. And to Zamorak.',
    art: { kind: 'humanoid', bg: 'castle', skin: '#d0a07a', body: '#24242a', head: 'helm', hat: '#26262c', weapon: 'sword', bladeColor: '#5a5a62', shield: '#22222a' },
  },
  hill_giant: {
    name: 'Hill Giant', type: 'unit', cost: 3, atk: 3, hp: 4, style: 'melee',
    flavor: 'Drops big bones. Lives under Edgeville.',
    art: { kind: 'humanoid', bg: 'dungeon', skin: '#c99a72', body: '#7a5730', head: 'bald', weapon: 'club', scale: 1.2, angry: true },
  },
  tok_xil: {
    name: 'Tok-Xil', type: 'unit', cost: 3, atk: 4, hp: 2, style: 'ranged',
    flavor: 'Fires the spines on its back. Pray Missiles.',
    art: { kind: 'tzhaar', bg: 'lava', variant: 'xil' },
  },
  aviansie: {
    name: 'Aviansie', type: 'unit', cost: 3, atk: 3, hp: 2, style: 'ranged', kw: ['charge'],
    flavor: 'Armadyl\'s winged warriors swoop from the God Wars Dungeon.',
    art: { kind: 'bird', bg: 'sky', color: '#7a5a38', accent: '#d8c27a' },
  },
  wise_old_man: {
    name: 'Wise Old Man', type: 'unit', cost: 3, atk: 2, hp: 3, style: 'magic',
    fx: [{ fx: 'draw', n: 1 }], text: 'When played: Draw a card.',
    flavor: 'Robbed the Draynor bank. Kept the blue partyhat.',
    art: { kind: 'humanoid', bg: 'arcane', skin: '#e6bf9a', body: '#6a3a8a', head: 'partyhat', hat: '#3b62e0', beard: '#f1f1f1', longBeard: true },
  },
  fire_blast: {
    name: 'Fire Blast', type: 'spell', sub: 'Spell', cost: 3, target: 'any',
    fx: [{ fx: 'dmg', n: 4 }], text: 'Deal 4 damage to a monster or the enemy.',
    flavor: 'Five fire runes, one death rune, one very unhappy target.',
    art: { kind: 'fireball', bg: 'arcane' },
  },
  home_teleport: {
    name: 'Home Teleport', type: 'spell', sub: 'Spell', cost: 3, target: 'unit',
    fx: [{ fx: 'bounce' }], text: 'Return a monster to its owner\'s hand.',
    flavor: 'Back to Lumbridge. Again.',
    art: { kind: 'teleport', bg: 'lumbridge' },
  },
  abyssal_whip: {
    name: 'Abyssal Whip', type: 'spell', sub: 'Equipment', cost: 3, target: 'friendlyUnit',
    fx: [{ fx: 'buff', atk: 3, hp: 1 }], text: 'Give a friendly monster +3 Attack and +1 Health.',
    flavor: 'Dropped by abyssal demons. Bought for 2.5m on the GE.',
    art: { kind: 'whip', bg: 'abyss' },
  },
  saradomin_brew: {
    name: 'Saradomin Brew', type: 'spell', sub: 'Potion', cost: 3, target: 'none',
    fx: [{ fx: 'healAllFriendly' }, { fx: 'healHero', n: 4 }], text: 'Fully heal your monsters. Restore 4 Hitpoints to yourself.',
    flavor: 'Tastes like holy water and regret.',
    art: { kind: 'potion', bg: 'holy', color: '#e8d27a' },
  },

  // ---------------- 4 cost ----------------
  moss_giant: {
    name: 'Moss Giant', type: 'unit', cost: 4, atk: 4, hp: 5, style: 'melee',
    flavor: 'Mossy. Giant. Exactly what it says.',
    art: { kind: 'humanoid', bg: 'swamp', skin: '#9a8a6a', body: '#4f6a2a', head: 'bald', weapon: 'club', scale: 1.25, moss: true, angry: true },
  },
  lesser_demon: {
    name: 'Lesser Demon', type: 'unit', cost: 4, atk: 5, hp: 4, style: 'magic',
    flavor: 'Trapped in the Wizards\' Tower cage. Mostly.',
    art: { kind: 'demon', bg: 'lava', color: '#b3261e', size: 0.9 },
  },
  crazy_archaeologist: {
    name: 'Crazy Archaeologist', type: 'unit', cost: 4, atk: 3, hp: 4, style: 'ranged',
    fx: [{ fx: 'dmgAllEnemyUnits', n: 1 }], text: 'When played: Deal 1 damage to all enemy monsters.',
    flavor: '"Rain of knowledge!" Explosive books incoming.',
    art: { kind: 'humanoid', bg: 'wilderness', skin: '#d9ab84', body: '#7a5a3a', head: 'fedora', hat: '#5a3d22', beard: '#9a9a9a', weapon: 'crossbow', books: true, angry: true },
  },
  ice_barrage: {
    name: 'Ice Barrage', type: 'spell', sub: 'Ancient Magick', cost: 4, target: 'enemyUnit',
    fx: [{ fx: 'dmg', n: 3 }, { fx: 'freeze' }], text: 'Deal 3 damage to an enemy monster and Freeze it.',
    flavor: 'Barrage them in the Wilderness. Classic.',
    art: { kind: 'ice', bg: 'arcane' },
  },
  dwarf_multicannon: {
    name: 'Dwarf Multicannon', type: 'spell', sub: 'Equipment', cost: 4, target: 'none',
    fx: [{ fx: 'dmgAllEnemyUnits', n: 2 }], text: 'Deal 2 damage to all enemy monsters.',
    flavor: 'Load cannonballs. Spin. Profit.',
    art: { kind: 'cannon', bg: 'dungeon' },
  },

  // ---------------- 5 cost ----------------
  count_draynor: {
    name: 'Count Draynor', type: 'unit', cost: 5, atk: 4, hp: 5, style: 'melee', kw: ['vampyric'],
    flavor: 'Bring garlic. And a stake. And a hammer.',
    art: { kind: 'humanoid', bg: 'night', skin: '#cfd2dc', body: '#1a1a22', cape: '#8a1020', head: 'vampire', hair: '#121212', fangs: true },
  },
  green_dragon: {
    name: 'Green Dragon', type: 'unit', cost: 5, atk: 5, hp: 5, style: 'magic',
    fx: [{ fx: 'dmgEnemyHero', n: 3 }], text: 'When played: Breathe fire, dealing 3 damage to the enemy.',
    flavor: 'Wear an anti-dragon shield. Seriously.',
    art: { kind: 'dragon', bg: 'wilderness', color: '#3f8a2f', heads: 1 },
  },
  ket_zek: {
    name: 'Ket-Zek', type: 'unit', cost: 5, atk: 5, hp: 6, style: 'magic',
    flavor: 'Wave 61 of the Fight Caves. Pray Mage!',
    art: { kind: 'tzhaar', bg: 'lava', variant: 'zek' },
  },
  dragon_claws: {
    name: 'Dragon Claws', type: 'spell', sub: 'Special Attack', cost: 5, target: 'enemyUnit',
    fx: [{ fx: 'dmg', n: 8 }], text: 'Special attack: Deal 8 damage to an enemy monster.',
    flavor: '4 hits. 1 very dead monster.',
    art: { kind: 'claws', bg: 'wilderness' },
  },

  // ---------------- 6 cost ----------------
  greater_demon: {
    name: 'Greater Demon', type: 'unit', cost: 6, atk: 6, hp: 7, style: 'melee',
    flavor: 'Bigger, angrier, and still trapped in the Wilderness.',
    art: { kind: 'demon', bg: 'lava', color: '#8a1d16', size: 1.1 },
  },
  zulrah: {
    name: 'Zulrah', type: 'unit', cost: 6, atk: 4, hp: 6, style: 'ranged', kw: ['venom'],
    flavor: 'The solitary serpent of Zul-Andra. Bring antivenom.',
    art: { kind: 'snake', bg: 'swamp' },
  },

  // ---------------- 7 cost ----------------
  general_graardor: {
    name: 'General Graardor', type: 'unit', cost: 7, atk: 6, hp: 8, style: 'melee', kw: ['guard'],
    flavor: '"Death to our enemies!" Bandos\'s finest.',
    art: { kind: 'humanoid', bg: 'gwd', skin: '#7c8a5e', body: '#5b5248', head: 'horns', weapon: 'club', scale: 1.3, angry: true, spikes: true },
  },
  commander_zilyana: {
    name: 'Commander Zilyana', type: 'unit', cost: 7, atk: 6, hp: 6, style: 'magic', kw: ['charge'],
    flavor: 'Saradomin\'s champion. Faster than you can run.',
    art: { kind: 'humanoid', bg: 'holy', skin: '#efd2b8', body: '#f2f2f2', trim: '#d8b23a', head: 'longhair', hair: '#f0dc8a', weapon: 'sword', bladeColor: '#e8f0ff', wings: '#ffffff' },
  },
  kreearra: {
    name: 'Kree\'arra', type: 'unit', cost: 7, atk: 6, hp: 6, style: 'ranged',
    fx: [{ fx: 'dmgAllEnemies', n: 2 }], text: 'When played: Deal 2 damage to all enemies.',
    flavor: 'Armadyl\'s general. Its whirlwind hits everyone.',
    art: { kind: 'bird', bg: 'sky', color: '#3a3346', accent: '#e0b84a', big: true },
  },
  kril: {
    name: 'K\'ril Tsutsaroth', type: 'unit', cost: 7, atk: 7, hp: 6, style: 'magic', kw: ['venom'],
    flavor: '"YARRRRRRR!" Zamorak\'s demon general.',
    art: { kind: 'demon', bg: 'zamorak', color: '#c22a1f', size: 1.25, kril: true },
  },

  // ---------------- 8+ cost ----------------
  kbd: {
    name: 'King Black Dragon', type: 'unit', cost: 8, atk: 7, hp: 8, style: 'magic',
    fx: [{ fx: 'dmgAllEnemyUnits', n: 2 }], text: 'When played: Deal 2 damage to all enemy monsters.',
    flavor: 'Three heads. Three breaths. Lair below the Wilderness.',
    art: { kind: 'dragon', bg: 'lava', color: '#26232a', heads: 3 },
  },
  jad: {
    name: 'TzTok-Jad', type: 'unit', cost: 9, atk: 8, hp: 9, style: 'all',
    text: 'Uses every combat style: always has the combat advantage.',
    flavor: 'Wave 63. The fire cape awaits.',
    art: { kind: 'jad', bg: 'lava' },
  },

  // ---------------- token ----------------
  coins: {
    name: 'Coins', type: 'spell', sub: 'Currency', cost: 0, target: 'none', token: true,
    fx: [{ fx: 'gainMana', n: 1 }], text: 'Gain 1 rune this turn only.',
    flavor: 'Given to whoever goes second. Buying gf.',
    art: { kind: 'coins', bg: 'gold' },
  },
};

// Real OSRS combat levels, shown as "(level-28)" like in-game.
const LEVELS = {chicken: 1, goblin: 2, imp: 2, dark_wizard: 20, al_kharid_warrior: 9, black_knight: 33, hill_giant: 28, tok_xil: 90, aviansie: 69, moss_giant: 42, lesser_demon: 82, crazy_archaeologist: 204, count_draynor: 34, green_dragon: 79, ket_zek: 360, greater_demon: 92, zulrah: 725, general_graardor: 624, commander_zilyana: 596, kreearra: 580, kril: 650, kbd: 276, jad: 702};

for (const [id, c] of Object.entries(CARDS)) {
  c.id = id;
  c.level = LEVELS[id] || null;
  c.kw = c.kw || [];
  c.fx = c.fx || [];
}

// The shared starter deck: both players get a shuffled copy.
export const DECK = [
  'chicken', 'goblin', 'goblin', 'hans', 'imp', 'wind_strike', 'wind_strike',
  'dark_wizard', 'dark_wizard', 'gnome_archer', 'gnome_archer', 'al_kharid_warrior', 'bob',
  'shark', 'super_combat', 'rune_platebody', 'dragon_dagger',
  'black_knight', 'hill_giant', 'tok_xil', 'aviansie', 'wise_old_man', 'fire_blast',
  'home_teleport', 'abyssal_whip', 'saradomin_brew',
  'moss_giant', 'lesser_demon', 'crazy_archaeologist', 'ice_barrage', 'dwarf_multicannon',
  'count_draynor', 'green_dragon', 'ket_zek', 'dragon_claws',
  'greater_demon', 'zulrah',
  'general_graardor', 'commander_zilyana', 'kreearra', 'kril',
  'kbd', 'jad',
];

export function cardText(c) {
  const parts = [];
  for (const k of c.kw) parts.push(KEYWORDS[k].name);
  return { keywords: parts, text: c.text || '' };
}
