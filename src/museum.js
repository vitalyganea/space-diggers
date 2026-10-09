/* The Museum (row 48): Professor Hoot takes finds as gifts. A gift leaves
   your backpack and goes on show for good; a set complete pays its reward
   once. Pure, on the save: { museum: { key: true }, setsDone: [set] }. */
import { FINDS, SETS } from './finds.js'

export const has = (save, key) => !!save.museum[key]
export function setProgress(save, set) {
  const keys = SETS[set].finds.map(f => f[0])
  return { have: keys.filter(k => has(save, k)).length, of: keys.length }
}
/* finds in the backpack the Museum does not have yet */
export function wanted(save, bag) { return Object.keys(bag.items).filter(k => FINDS[k] && !has(save, k)) }

/* Give `key` from `bag`. Returns null if it can't, else { set, done, reward }. */
export function donate(save, bag, key) {
  if (!FINDS[key] || has(save, key) || !bag.take(key)) return null
  save.museum[key] = true
  const set = FINDS[key].set, p = setProgress(save, set)
  const done = p.have === p.of && !save.setsDone.includes(set)
  if (done) save.setsDone.push(set)
  return { set, done, reward: done ? SETS[set].reward : 0 }
}
