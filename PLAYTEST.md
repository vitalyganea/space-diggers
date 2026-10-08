# Playtest

## 2026-10-08: first full round (tools/playtest.cjs, seed 42, desktop 1280×720)

A whole round of the real game, played with mouse and keys only (look down
and hold to dig, 1 to buy drills, tunnel sideways round lava, W to step),
against the five bots, then the results, the animal shop and Play again.

| | |
|---|---|
| Result | You reached the Core in 133 s of race time, 1st |
| Bots at the end | Chomp 73 m, Gizmo 72, Nugget 70, Rocky 69, Bev 68 |
| Player's coins on the way | 0 by 30 s, 11 by 120 s, 29 at the end (drill never upgraded) |
| Results card | +128 (29 kept, 50 place, 49 depth), Animals and Play again work |
| Next round | starts with the save carried over |
| Console | clean |

### What felt off (for the user to decide)

1. **The bots are too slow for a good player.** A player who simply holds
   the button looking down beat every bot by ~25 blocks. The robot player
   reacts instantly, so a person will be slower, but the bots should still
   be a real race. The fix is in `src/game.js`: raise their skill (now
   0.72–0.94 of the player's base speed) and shorten their pause between
   blocks.
2. **Ore barely matters to someone digging straight down.** 29 coins in a
   whole round, so the drill upgrades never came into play. Either more ore
   near the shaft, or veins you can see from the shaft and go after.
3. **Not judged here:** how it feels and sounds to a person, and the frame
   rate on a real GPU. Headless Chrome runs on a software GPU at ~8 fps, so
   only a person in a real browser can judge the speed.
