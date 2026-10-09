/* The people in the base's modules (row 46, asked for by the user): you
   buy from them, not from a door. Each stands behind a counter in its
   module, turns to you as you come in and waves; walk up to the counter
   and press E to talk, and the shop opens with their face and a line
   about how you are doing. For children the lines also say what to do.

     Rita     a fox, at the Trade Hub: she buys what you dig up
     Gizmo    a raccoon mechanic, at the Workshop: upgrades and the laser
     Boomer   a rabbit, at the Bomb Shop: bombs and tickets home
     Hoot     an owl professor, at the Museum (opens with stage 2)
     Sprocket an otter, at the Robot Bay (opens with stage 3)

   The species are looks for src/animals.js's makeAnimal. lineFor() is
   pure, so the lines can be tested. */
export const KEEPERS = {
  market: { name: 'Rita', look: { name: 'Fox', body: '#e8762c', belly: '#fff1e0', nose: '#2b1d14', ear: '#c75f1e', claw: '#3b2a1d', eye: '#111111', tail: '#e8762c' } },
  workshop: { name: 'Gizmo', look: { name: 'Raccoon', body: '#8e8f96', belly: '#d9dadf', nose: '#1f2024', ear: '#5d5e65', claw: '#3b3c41', eye: '#111111', mask: '#2b2c31', tail: '#55565c' } },
  bombs: { name: 'Boomer', look: { name: 'Rabbit', body: '#f2efe9', belly: '#ffffff', nose: '#f29bb2', ear: '#f2efe9', claw: '#e5ded3', eye: '#d23b3b', longEars: true } },
  museum: { name: 'Hoot', look: { name: 'Owl', body: '#7a5c3e', belly: '#d8c3a5', nose: '#f5a524', ear: '#5e4630', claw: '#f5a524', eye: '#111111', bigEyes: true } },
  robots: { name: 'Sprocket', look: { name: 'Otter', body: '#6b4f3a', belly: '#c9a98a', nose: '#2b1d14', ear: '#5a3f2c', claw: '#3b2a1d', eye: '#111111', tail: '#5a3f2c' } },
}

// every keeper lit a little from within, so they read in their module whichever way they face
for (const k of Object.values(KEEPERS)) k.look.glow = 0.45

const pick = (a, r) => a[Math.floor(r * a.length) % a.length]

/* What the keeper of `key` says as you come up. s: { bag (items by key),
   bagCount, coins, cheapest (next upgrade's price or null), laser (0/1+),
   bombs, tickets, justSold (coins from a sale just made, or 0), best
   (the dearest item in the bag, or null) }. r: 0..1 for variety. */
export function lineFor(key, s, r = 0) {
  if (key === 'market') {
    if (s.justSold > 0) return pick([`${s.justSold} coins! Pleasure doing business.`, `There you go: ${s.justSold} coins. Come back soon!`], r)
    if (s.best === 'meteor' || s.best === 'stargem') return pick(['Wow! Is that what I think it is? Let me see!', 'Ooh, that one sparkles! It is worth a lot.'], r)
    if (!s.bagCount) return pick(['Nothing to sell yet? Go and dig, I will be right here!', 'Bring me shiny ore and I will pay you coins.'], r)
    return pick(['What did you find today? Let me have a look.', 'Hello, digger! I buy everything you dig up.'], r)
  }
  if (key === 'workshop') {
    if (s.cheapest !== null && s.coins >= s.cheapest) return pick(['You have enough for an upgrade! Pick one.', 'Ready to upgrade? A faster drill digs deeper!'], r)
    if (!s.laser && s.coins >= 60) return 'Saving for my laser? It cuts black meteorite like butter!'
    if (s.cheapest !== null) return `Come back with ${s.cheapest - s.coins} more coins for your next upgrade.`
    return 'Your gear is the best there is. Nothing left to make!'
  }
  if (key === 'bombs') {
    if (!s.bombs) return pick(['Boom! A bomb clears a whole ball of rock. Q to throw it.', 'Need to dig a lot, fast? Bombs!'], r)
    if (!s.tickets) return 'A ticket takes you home from anywhere. Press T!'
    return pick(['Careful with those! Throw them far with Q.', 'Boom-boom! Ready for more?'], r)
  }
  if (key === 'museum') return 'The museum opens soon! Keep your rarest finds for me.'
  if (key === 'robots') return 'Soon I will have robot capsules for you. Keep digging!'
  return 'Hello!'
}

/* Where each keeper stands and where you stand to talk, for a building
   b (src/town.js): behind the counter, and in front of it. */
export function keeperSpots(b) {
  const [fx, fz] = b.face
  return {
    keeper: [b.at[0] - fx * 4 + 0.5, 1, b.at[1] - fz * 4 + 0.5],
    talk: [b.at[0] - fx * 2 + 0.5, 1, b.at[1] - fz * 2 + 0.5],
  }
}
