/* The people in the base's modules (row 46, asked for by the user): you
   buy from them, not from a door. Each stands behind a counter in its
   module, turns to you as you come in and waves; walk up to the counter
   and press E to talk, and the shop opens with their face and a line
   about how you are doing. For children the lines also say what to do.

     Rita     at the Trade Hub: she buys what you dig up
     Gizmo    the mechanic, at the Workshop: upgrades and the laser
     Boomer   at the Bomb Shop: bombs and tickets home
     Professor Hoot, at the Museum (opens with stage 2)
     Sprocket at the Robot Bay (opens with stage 3)

   People in space suits (src/people.js), each with their own face, hair
   and their module's colour on the suit (the user asked for people, not
   animals). lineFor() is
   pure, so the lines can be tested. */
export const KEEPERS = {
  market: { name: 'Rita', look: { skin: '#f1c7a0', hair: '#b4532a', hairStyle: 'long', accent: '#2fbf71', eyes: '#166534' } },
  workshop: { name: 'Gizmo', look: { skin: '#c68e63', hair: '#1f2937', hairStyle: 'short', accent: '#f5c518', beard: true } },
  bombs: { name: 'Boomer', look: { skin: '#f6d2b0', hair: '#f59e0b', hairStyle: 'curly', accent: '#e63946', eyes: '#1e3a8a' } },
  museum: { name: 'Professor Hoot', look: { skin: '#e9b98f', hair: '#d1d5db', hairStyle: 'bald', accent: '#3b82f6', glasses: true, beard: true } },
  outpost: { name: 'Frosty', look: { skin: '#f5d0b5', hair: '#e5e7eb', hairStyle: 'short', accent: '#2fbf71', eyes: '#0369a1', beard: true } },
  pad: { name: 'Captain Nova', look: { skin: '#a8714f', hair: '#111827', hairStyle: 'long', accent: '#f97316', eyes: '#1f2937' } },
  robots: { name: 'Sprocket', look: { skin: '#8d5a3b', hair: '#111827', hairStyle: 'bun', accent: '#8b5cf6' } },
}

// every keeper lit a little from within, so they read in their module whichever way they face
for (const k of Object.values(KEEPERS)) k.look.glow = 0.45

const pick = (a, r) => a[Math.floor(r * a.length) % a.length]

/* What the keeper of `key` says as you come up. s: { bag (items by key),
   bagCount, coins, cheapest (next upgrade's price or null), laser (0/1+),
   bombs, tickets, justSold (coins from a sale just made, or 0), best
   (the dearest item in the bag, or null) }. r: 0..1 for variety. */
export function lineFor(key, s, r = 0) {
  if (key === 'outpost') key = 'market'                              // the outposts' Trade Hubs buy like Rita's
  if (key === 'pad') {
    if (s.canOpen) return 'You have enough coins to open a new planet! Where to?'
    return pick(['Ready for take-off? Pick a planet!', 'Buckle up, digger! The stars are waiting.'], r)
  }
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
  if (key === 'museum') {
    if (s.setDone) return `The ${s.setDone} are complete! Here is your reward!`
    if (s.gave) return pick(['Splendid! It goes straight on show.', 'Marvellous! Thank you, young explorer.'], r)
    if (s.canGive) return 'Oh my! You have something for my collection!'
    return pick(['Bring me finds from the deep and I will put them on show.', 'Complete a set and I will reward you well!'], r)
  }
  if (key === 'robots') {
    if (s.robotNews) return s.robotNews
    if (s.robotCheapest !== null && s.coins >= s.robotCheapest) return 'Your robot could use an upgrade. Let me tune it up!'
    return pick(['A happy robot is a fast robot! What shall we upgrade?', 'Bring coins and I will make your robot even better.'], r)
  }
  return 'Hello!'
}

/* Where each keeper stands and where you stand to talk, for a building
   b (src/town.js): behind the counter, and in front of it. */
export function keeperSpots(b) {
  const [fx, fz] = b.face
  // the pilot stands on the launch pad, two blocks from where you talk
  if (b.door) return { keeper: [b.door[0] - 2, 1, b.door[2]], talk: [...b.door] }
  return {
    keeper: [b.at[0] - fx * 4 + 0.5, 1, b.at[1] - fz * 4 + 0.5],
    talk: [b.at[0] - fx * 2 + 0.5, 1, b.at[1] - fz * 2 + 0.5],
  }
}
