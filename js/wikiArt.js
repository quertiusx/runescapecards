// Official pictures from the Old School RuneScape Wiki (oldschool.runescape.wiki),
// fetched at runtime through its free MediaWiki API. Nothing is stored in this
// repo: the images are Jagex's and are loaded straight from the wiki.
// If the wiki can't be reached, or an image can't be used on a canvas (CORS),
// that card keeps its pixel-model art.

const API = 'https://oldschool.runescape.wiki/api.php';
const CACHE_KEY = 'gg-wiki-art-v1';

// card id -> wiki page title
export const WIKI_TITLES = {
  chicken: 'Chicken', goblin: 'Goblin', hans: 'Hans', imp: 'Imp', wind_strike: 'Wind Strike',
  dark_wizard: 'Dark wizard', gnome_archer: 'Gnome archer', al_kharid_warrior: 'Al-Kharid warrior', bob: 'Bob (cat)',
  shark: 'Shark', super_combat: 'Super combat potion', rune_platebody: 'Rune platebody', dragon_dagger: 'Dragon dagger(p++)',
  black_knight: 'Black Knight', hill_giant: 'Hill Giant', tok_xil: 'Tok-Xil', aviansie: 'Aviansie', wise_old_man: 'Wise Old Man',
  fire_blast: 'Fire Blast', home_teleport: 'Lumbridge Home Teleport', abyssal_whip: 'Abyssal whip', saradomin_brew: 'Saradomin brew',
  moss_giant: 'Moss giant', lesser_demon: 'Lesser demon', crazy_archaeologist: 'Crazy archaeologist', ice_barrage: 'Ice Barrage',
  dwarf_multicannon: 'Dwarf multicannon', count_draynor: 'Count Draynor', green_dragon: 'Green dragon', ket_zek: 'Ket-Zek',
  dragon_claws: 'Dragon claws', greater_demon: 'Greater demon', zulrah: 'Zulrah', general_graardor: 'General Graardor',
  commander_zilyana: 'Commander Zilyana', kreearra: "Kree'arra", kril: "K'ril Tsutsaroth", kbd: 'King Black Dragon',
  jad: 'TzTok-Jad', coins: 'Coins',
};

const images = new Map(); // card id -> HTMLImageElement (CORS-clean)
export const wikiImage = (id) => images.get(id) || null;
export const wikiCount = () => images.size;

function readCache() { try { return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); } catch (e) { return null; } }
function writeCache(v) { try { localStorage.setItem(CACHE_KEY, JSON.stringify(v)); } catch (e) { /* storage off */ } }

// Ask the wiki for each page's lead image (the infobox picture).
async function lookupUrls() {
  const cached = readCache();
  if (cached && Date.now() - cached.at < 7 * 864e5) return cached.urls;
  const ids = Object.keys(WIKI_TITLES);
  const params = new URLSearchParams({
    action: 'query', prop: 'pageimages', piprop: 'thumbnail', pithumbsize: '480', pilimit: '50',
    redirects: '1', format: 'json', formatversion: '2', origin: '*',
    titles: ids.map((id) => WIKI_TITLES[id]).join('|'),
  });
  const res = await fetch(`${API}?${params}`);
  if (!res.ok) throw new Error(`wiki API ${res.status}`);
  const data = await res.json();
  const q = data.query || {};
  // follow the API's title rewrites (normalisation, redirects) back to our titles
  const alias = new Map();
  for (const n of [...(q.normalized || []), ...(q.redirects || [])]) alias.set(n.to, n.from);
  const resolve = (t) => { let cur = t; for (let i = 0; i < 4 && alias.has(cur); i++) cur = alias.get(cur); return cur; };
  const byTitle = new Map(ids.map((id) => [WIKI_TITLES[id], id]));
  const urls = {};
  for (const page of q.pages || []) {
    if (!page.thumbnail) continue;
    const id = byTitle.get(resolve(page.title)) || byTitle.get(page.title);
    if (id) urls[id] = page.thumbnail.source;
  }
  writeCache({ at: Date.now(), urls });
  return urls;
}

function loadImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // needed to draw it onto the card canvases
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

// Loads as many pictures as it can within `timeoutMs`. Resolves with a count.
export async function loadWikiArt({ timeoutMs = 6000, onProgress } = {}) {
  const work = (async () => {
    const urls = await lookupUrls();
    const entries = Object.entries(urls);
    let done = 0;
    await Promise.all(entries.map(async ([id, url]) => {
      const img = await loadImage(url);
      if (img && img.naturalWidth) images.set(id, img);
      done++; onProgress && onProgress(done, entries.length);
    }));
    return images.size;
  })();
  try {
    return await Promise.race([work, new Promise((r) => setTimeout(() => r(images.size), timeoutMs))]);
  } catch (e) {
    console.warn('OSRS Wiki pictures unavailable, using pixel models instead.', e);
    return images.size;
  }
}
