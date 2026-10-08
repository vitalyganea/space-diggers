# Systems

Build order top to bottom. Don't reorder without a real dependency reason;
note it inline if you do.

| #  | System | Status | Test notes |
|----|--------|--------|------------|
| 1  | Engine & controls: Vite + noa, first-person camera, pointer lock, WASD, jump, collisions with blocks | done | `src/engine.js` (one noa engine: first person, sticky pointer lock, reach 6, walk 6.5, a jump that clears one block), boot in `src/main.js` (`?dev`, `?dev=<name>`, else the game). `tests/controls.js` in headless Chrome with real keys and mouse on `?dev=controls`, 13/13: on the floor at start, a click locks the mouse, a mouse move turns the view, W walks the way he looks, the wall stops him at its face (z -6.7 against -7), A and D strafe, a jump peaks at 1.62 (one block, not two) and lands, W+Space climbs a one-block step while a two-block one stops him, he falls into a pit and lands. Found on the way: in noa, heading 0 looks down +z (the test had assumed -z), and the first step test held W too long and walked off the far side; it now checks the path. Console clean once a favicon was added. `tools/cdp.js` comes from brainrot-merge with key and mouse-hold events added. |
| 2  | Block textures: 16×16 pixel art made by a script (grass, dirt, stone, deep stone, lava rock, crystal, ores, Core) | done | `tools/make-textures.mjs` (no dependencies: seeded noise per palette, ore lumps lit top-left, veins, a tiny PNG encoder) writes 13 textures to `public/tex/`; `src/blocks.js` is the block table (id, textures, hardness, coins) and registers them, grass with its own top, bottom and side. One texture per block rather than an atlas: noa takes a texture per material and 13 is few. `?dev=textures` in Chrome: a pillar of every block on a grass field; all twelve read apart at a distance and up close, pixels crisp (nearest sampling), the target outline shows. First look: the grass top was so busy it shimmered at a distance; its palette was narrowed. `tests/textures.mjs`: every texture 16×16, regenerating gives identical bytes, ids unique (15/15). Console clean. |
| 3  | World generation: a race column per player, layers by depth, ore veins, small caves, a lava band, the Core at the bottom | done | `src/worldgen.js`, a pure `(seed) -> voxel(x,y,z)`: grass, dirt to -4, stone to -35 (coal, iron), deep stone to -65 (gold, gems, iron), basalt to -85 with lava, crystal to -99, the Core from -100; boundaries wobble a block; caves and random lava from two-scale value noise. Six lanes 10 apart. Fairness, measured in `tests/worldgen.mjs` (16/16): within 3 blocks of each lane's shaft there are no random caves or lava, and every lane gets the same two designed lava pockets (20 blocks) to dig around; digging straight down costs 110–112 s in every lane (2% spread). First attempt made the world repeat exactly every 10 blocks so lanes were identical: `?dev=world` (a cutaway, viewed from the side) showed it as wallpaper, and value noise on one 5-block lattice made lava into big rectangles. Second attempt, plain random: the test caught one lane with 32 lava blocks under it and the others none. Third is the one above; the cutaway at -12, -45 and -82 reads as natural rock. Console clean. |
| 4  | Digging: hold to break, hardness by layer, crack overlay, break particles, the block's ore paid in coins | done | `src/digging.js` (`Digger`): hold the left button on the targeted block; it takes its `hard` seconds over `speed` (the drill multiplier for row 9); a new aim starts over; a cracked shell in five stages sits on it; on breaking, eight small cubes of its texture fly and fall, and its coins are paid. Lava and the Core cannot be dug. A crosshair (`src/ui/crosshair.js`). `tests/dig.js` on `?dev=dig` with the real mouse, 15/15: aims at the grass underfoot, a 0.2 s press leaves it, it breaks in 0.35 s as set, holding on digs straight down (grass, dirt, dirt, stone, stone), ores pay 2 / 5 / 12, lava and Core survive 2.5 s of digging, a half-dug block wears cracks that go on release, two short presses do not add up. On the way: noa's round player shadow showed as a dark disc at your feet in first person (removed in `engine.js`); the first cracks were blotches that darkened the whole face, now thin lines running out from the middle (screenshot shows them, and the particles). Console clean. |
| 5  | Look & feel pass (Bloxd level): sky, fog, light dimming with depth, drill in hand with a swing, footstep and dig shake | done | `src/look.js`: a vertex-coloured sky dome, blocky pixel clouds drifting overhead, linear fog hiding the edge of the loaded world, light from high south-west; going down, sky, fog and daylight fade to brown-black by y -40 while a warm lamp on the helmet takes over; a blocky yellow drill in the lower right (its own rendering group, so it never sinks into walls) that bobs as you walk and pushes in and buzzes while you dig, its bit spinning. Also: low hills and trees (new log and leaves blocks) outside a flat race arena (`ARENA` in worldgen, checked: arena flat and treeless, 197 trees and hills to 6 outside). `tests/look.js` 7/7 (sky, dome, clouds and light at the surface; dimmer with a brighter lamp at -20; near-black with the lamp doing the lighting at -60; drill in hand and pushing while digging). Screens judged at the surface, -15, -50, -80, -88. Found on the way: noa only draws meshes handed to `addMeshToScene`, so the drill was invisible at first; it was then twice the size it should be; trees at 2.2% made a wall of forest, now 0.9%. Not done: a camera shake (only the drill moves). All earlier checks re-run and pass (`tests/run.sh`). |
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
