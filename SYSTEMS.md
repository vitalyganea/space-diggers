# Systems

Build order top to bottom. Don't reorder without a real dependency reason;
note it inline if you do.

| #  | System | Status | Test notes |
|----|--------|--------|------------|
| 1  | Engine & controls: Vite + noa, first-person camera, pointer lock, WASD, jump, collisions with blocks | done | `src/engine.js` (one noa engine: first person, sticky pointer lock, reach 6, walk 6.5, a jump that clears one block), boot in `src/main.js` (`?dev`, `?dev=<name>`, else the game). `tests/controls.js` in headless Chrome with real keys and mouse on `?dev=controls`, 13/13: on the floor at start, a click locks the mouse, a mouse move turns the view, W walks the way he looks, the wall stops him at its face (z -6.7 against -7), A and D strafe, a jump peaks at 1.62 (one block, not two) and lands, W+Space climbs a one-block step while a two-block one stops him, he falls into a pit and lands. Found on the way: in noa, heading 0 looks down +z (the test had assumed -z), and the first step test held W too long and walked off the far side; it now checks the path. Console clean once a favicon was added. `tools/cdp.js` comes from brainrot-merge with key and mouse-hold events added. |
| 2  | Block textures: 16×16 pixel art made by a script (grass, dirt, stone, deep stone, lava rock, crystal, ores, Core) | done | `tools/make-textures.mjs` (no dependencies: seeded noise per palette, ore lumps lit top-left, veins, a tiny PNG encoder) writes 13 textures to `public/tex/`; `src/blocks.js` is the block table (id, textures, hardness, coins) and registers them, grass with its own top, bottom and side. One texture per block rather than an atlas: noa takes a texture per material and 13 is few. `?dev=textures` in Chrome: a pillar of every block on a grass field; all twelve read apart at a distance and up close, pixels crisp (nearest sampling), the target outline shows. First look: the grass top was so busy it shimmered at a distance; its palette was narrowed. `tests/textures.mjs`: every texture 16×16, regenerating gives identical bytes, ids unique (15/15). Console clean. |
| 3  | World generation: a race column per player, layers by depth, ore veins, small caves, a lava band, the Core at the bottom | pending | |
| 4  | Digging: hold to break, hardness by layer, crack overlay, break particles, the block's ore paid in coins | pending | |
| 5  | Look & feel pass (Bloxd level): sky, fog, light dimming with depth, drill in hand with a swing, footstep and dig shake | pending | |
| 6  | Animal characters: blocky models (mole first), shown for bots, with a name tag | pending | |
| 7  | Bots: dig down towards the Core at a tuned pace, buy upgrades, use bombs | pending | |
| 8  | Round flow: countdown, timer, depth leaderboard on the HUD, win on touching the Core, results screen | pending | |
| 9  | In-round upgrades: coins buy drill speed and bombs (number keys or a small panel) | pending | |
| 10 | Sabotage: throwing a bomb (blast carves a sphere, collapses shafts), dropping a block into a shaft | pending | |
| 11 | Meta: coins kept after the round, animal shop with a perk each, save | pending | |
| 12 | Audio: dig, break, ore, bomb, win, made with WebAudio | pending | |
| 13 | CrazyGames SDK: gameplay start/stop, data save, midgame ad between rounds, loading | pending | |
| 14 | Full playtest: a real round start to finish, desktop | pending | |

Status values: `pending` / `building` / `testing` / `done`.

Audio (row 12) is in because "Bloxd-level finish" includes sound; it can
move or drop if the user wants.

## Dev level

`?dev` lists every sandbox in `src/dev/`; `?dev=<name>` opens one. Each
system adds a file there (`controls.js` so far); `src/dev/hud.js` is the
corner readout they share, and each sandbox puts its state on
`window.__dev` for the tests in `tests/`.

## Testing

`npm run dev -- --port 5181`, then `node tests/<system>.js`. Headless Chrome over the DevTools protocol (the same approach as
brainrot-merge's `tools/cdp.js`), with real keyboard and mouse events and
screenshots, plus whatever the engine state exposes on `window` in dev
builds.
