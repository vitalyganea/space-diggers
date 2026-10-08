# Systems

Build order top to bottom. Don't reorder without a real dependency reason;
note it inline if you do.

| #  | System | Status | Test notes |
|----|--------|--------|------------|
| 1  | Engine & controls: Vite + noa, first-person camera, pointer lock, WASD, jump, collisions with blocks | pending | Spike (pre-row): noa 0.33 + Babylon 6.49 ran in headless Chrome on WebGL2 and drew voxel terrain with AO. |
| 2  | Block textures: a 16×16 pixel atlas made by a script (grass, dirt, stone, deep stone, lava rock, crystal, ores, Core) | pending | |
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

To be added in row 1: `?dev=<name>` opens a sandbox per system (a flat
test world, one ore of each kind, a bot in a pit), and `?dev` lists them.

## Testing

Headless Chrome over the DevTools protocol (the same approach as
brainrot-merge's `tools/cdp.js`), with real keyboard and mouse events and
screenshots, plus whatever the engine state exposes on `window` in dev
builds.
