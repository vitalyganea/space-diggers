/* The robot's tip (row 35): one short, useful thing to do next, picked
   from where you are. Pure, so it can be tested. s: { batt (0..1), depth,
   bag, cap, coins, cheapest (the cheapest next upgrade, or null), onPad,
   tickets } */
export function tip(s) {
  if (s.batt < 0.25 && s.depth >= 3) return s.tickets > 0
    ? 'Battery low! Press T to go home with a ticket, then stand on the charging pad.'
    : 'Battery low! Climb up: hold Space against a wall. Then stand on the charging pad in the base.'
  if (s.batt < 0.6 && s.depth < 3 && !s.onPad) return 'Charge up on the glowing charging pad in the middle of the base. It is quick!'
  if (s.bag >= s.cap) return 'The backpack is full! Sell it all at the Trade Hub, the green sign.'
  if (s.cheapest !== null && s.coins >= s.cheapest) return 'You have enough coins for an upgrade! Visit the Workshop, the yellow sign.'
  if (s.depth < 1 && s.bag === 0) return 'Walk out of the base, look down and hold the left mouse button to dig.'
  if (s.depth >= 1 && s.bag < s.cap) return 'Look at the tunnel walls: shiny ore is worth digging sideways for.'
  if (s.bag > 0 && s.depth < 3) return 'Sell what you found at the Trade Hub, the green sign.'
  return 'Keep digging! The deeper you go, the better the treasure.'
}
