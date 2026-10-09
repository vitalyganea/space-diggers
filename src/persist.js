/* The world kept between sessions: its seed, every changed block, and
   where the player stood.

   Edits are stored by column and run: "x,z:y0-y1=id|y=id;..." with ys
   from top to bottom, so a dug shaft of eighty blocks is one short run
   and not eighty entries. That keeps a long-played world well inside a
   few hundred KB (localStorage and the CrazyGames data module both have
   limits; tests/persist.mjs measures it). */
export const WORLD_KEY = 'spacediggers-world-v1'

export function encodeEdits(edits) {
  const cols = new Map()
  for (const [k, id] of edits) {
    const [x, y, z] = k.split(',').map(Number)
    const c = x + ',' + z
    if (!cols.has(c)) cols.set(c, [])
    cols.get(c).push([y, id])
  }
  const out = []
  for (const [c, list] of cols) {
    list.sort((a, b) => b[0] - a[0])
    const runs = []
    for (let i = 0; i < list.length;) {
      let j = i
      while (j + 1 < list.length && list[j + 1][0] === list[j][0] - 1 && list[j + 1][1] === list[i][1]) j++
      runs.push(i === j ? `${list[i][0]}=${list[i][1]}` : `${list[i][0]}~${list[j][0]}=${list[i][1]}`)
      i = j + 1
    }
    out.push(c + ':' + runs.join('|'))
  }
  return out.join(';')
}

export function decodeEdits(s) {
  const edits = new Map()
  if (!s) return edits
  for (const col of s.split(';')) {
    const [c, runs] = col.split(':')
    if (!runs) continue
    const [x, z] = c.split(',').map(Number)
    for (const r of runs.split('|')) {
      const [ys, idS] = r.split('=')
      const id = +idS
      const [a, b] = ys.includes('~') ? ys.split('~').map(Number) : [+ys, +ys]
      if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(id) || a - b > 4096) continue
      for (let y = a; y >= b; y--) edits.set(`${x},${y},${z}`, id)
    }
  }
  return edits
}

export function saveWorld(storage, world, pos) {
  const data = JSON.stringify({ v: 1, seed: world.seed, pos: pos.map(v => +v.toFixed(2)), edits: encodeEdits(world.edits) })
  try { storage.setItem(WORLD_KEY, data) } catch (e) { /* full or private: play on */ }
  return data.length
}

/* { seed, pos, edits } or null for a new world */
export function loadWorld(storage) {
  try {
    const o = JSON.parse(storage.getItem(WORLD_KEY) || 'null')
    if (!o || typeof o !== 'object' || !Number.isFinite(o.seed)) return null
    const pos = Array.isArray(o.pos) && o.pos.length === 3 && o.pos.every(Number.isFinite) ? o.pos : null
    return { seed: o.seed, pos, edits: decodeEdits(String(o.edits || '')) }
  } catch (e) { return null }
}
