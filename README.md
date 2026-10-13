# Gielinor Gambit

A 1v1 card duel in a 3D medieval tavern, themed on RuneScape. You sit at a table in the Rising Sun Inn in Falador, across from your opponent, and play monsters, spells and gear onto the table. Like Liar's Bar, the camera is first person: drag to look around the tavern, and watch where your opponent is looking.

## Play

It is a static web page with no build step and no server code. Any static file server works:

```
cd runescapecards
python3 -m http.server 8000
# open http://localhost:8000
```

(Opening `index.html` straight from disk won't work, because browsers block ES modules on `file://`.)

To play online, host it on any static host (GitHub Pages, Netlify, itch.io...).

### Modes

- **Duel the Tavern Champion**: play against the computer.
- **Host Online Duel**: you get a 5-letter room code and an invite link. Send it to a friend.
- **Join**: enter a friend's room code (or just open their invite link).

Online play is peer-to-peer over WebRTC ([PeerJS](https://peerjs.com/)). The free public PeerJS server is only used to connect the two players. The host's browser runs the game rules, so the guest can't see the host's hand or deck. Both players' head movements are synced, so you can see where your opponent is looking.

If the public PeerJS server is down or blocked on your network, run your own (`npx peerjs --port 9000`) and add it to the URL: `?peerhost=your.host&peerport=9000`. Invite links keep these settings.

## Rules (short version)

- Both players start with **30 Hitpoints**. Bring your opponent to 0.
- Cards cost **runes**. You get 1 rune on turn 1, 2 on turn 2, and so on up to 10. Runes refill every turn. The player who goes second gets a free **Coins** card (+1 rune once).
- On your turn: draw a card, play cards, attack, then **End Turn**.
- **Monsters** have Attack (bottom left) and Health (bottom right). When two monsters fight, both deal damage. A monster can attack once per turn, starting the turn after it's played.
- **Combat triangle**: Melee beats Ranged, Ranged beats Magic, Magic beats Melee. A monster deals **double damage** to a style it beats, when attacking and when hitting back.
- **Keywords**: Guard (must be attacked first), Charge (can attack right away), Venom (destroys any monster it damages), Vampyric (its damage heals you), Frozen (skips its next attack).
- Turns are limited to 75 seconds online.

The full rules are under **How to Play** in the game, and every card is in the **Card Codex**.

## Controls

| Action | How |
|---|---|
| Play a card | Click a glowing card in your hand, then click a spot or a target. Dragging also works. |
| Attack | Click one of your glowing monsters, then click an enemy monster or your opponent. |
| Read a card | Hover over it |
| Look around | Drag the scene, right-drag, or use the arrow keys / WASD. R recentres, the mouse wheel leans in. |
| Cancel | Right-click or Esc |
| End turn | End Turn button, Enter or E |
| Chat | Type in the chatbox. RuneScape chat effects work: `red:`, `green:`, `cyan:`, `purple:`, `white:`, `flash1:`, `wave:` |

## The cards

43 cards, shared by both players. They include Hans, Goblins, Bob the Cat, the Wise Old Man (with his blue partyhat), Count Draynor, the Fight Cave TzHaar and TzTok-Jad, Zulrah, the God Wars generals (Graardor, Zilyana, Kree'arra, K'ril), the King Black Dragon, plus spells and gear like Ice Barrage, Fire Blast, Dragon Claws, Abyssal Whip, Dragon Dagger (p++), Rune Platebody, Sharks, Saradomin Brews and the Dwarf Multicannon.

**Card art.** By default the game loads the official character and item pictures from the [Old School RuneScape Wiki](https://oldschool.runescape.wiki) when it starts. It uses the wiki's free MediaWiki API (`prop=pageimages`, one request for all cards, cached for a week in the browser). The images are not stored in this repo; they are Jagex's and are fetched straight from the wiki. If the wiki can't be reached, a card keeps its built-in art: a low-poly OSRS-style model rendered in code. You can switch between the two with the **Card art** button on the main menu. The page titles for each card are in `js/wikiArt.js`.

The 3D tavern, the duellists, the textures and the sounds are all generated in code (Three.js primitives, canvas drawings and Web Audio).

## Code layout

| File | What it does |
|---|---|
| `js/cards.js` | Card data, combat triangle, keywords, the deck |
| `js/game.js` | Rules engine: state, actions, damage, turns, hidden-info views |
| `js/ai.js` | Computer opponent |
| `js/net.js` | PeerJS networking (host and guest) |
| `js/scene.js` | Three.js scene: camera, board, hand, input, animations, hitsplats |
| `js/tavern.js` | The tavern: walls, fireplace, bar, lights, props |
| `js/avatar.js` | Seated duellists (Rune Knight, Wizard, Ranger) |
| `js/cardArt.js` | Draws card faces, board tokens and card backs on canvas |
| `js/models.js` | Low-poly OSRS-style models for the cards and duellists |
| `js/wikiArt.js` | Loads the official pictures from the OSRS Wiki API |
| `js/textures.js` | Procedural wood, stone, plaster, banners, table mat |
| `js/audio.js` | Synthesised sound effects and fireplace ambience |
| `js/main.js` | Menus, game flow, HUD, chat |

Three.js (r169) and PeerJS (1.5.4) are vendored in `vendor/`, so the game doesn't depend on a CDN.

*RuneScape is a trademark of Jagex Ltd. This is an unofficial fan project, not affiliated with or endorsed by Jagex.*
