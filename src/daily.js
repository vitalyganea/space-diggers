/* Coming back each day (stage 5, row 50): a daily reward on a seven-day
   streak, and three small quests a day. Pure, on the save's `daily`
   ({ last, streak, day, quests }) and a day string 'YYYY-MM-DD', so it can
   be tested; the game passes today's date.

   Missing a day starts the streak again at day 1: kind, but a reason to
   come back. Quests are things a child does anyway, a little more of. */
export const STREAK = [
  { coins: 20 }, { coins: 30, bombs: 1 }, { coins: 40, tickets: 1 }, { coins: 60 },
  { coins: 80, bombs: 2 }, { coins: 100, tickets: 1 }, { coins: 150, find: 'rare' },
]
export const QUESTS = {
  dig: { text: n => `Dig ${n} blocks`, goals: [40, 60, 80], reward: 40 },
  finds: { text: n => `Find ${n} treasure${n > 1 ? 's' : ''}`, goals: [1, 2, 3], reward: 60 },
  sell: { text: n => `Sell for ${n} coins`, goals: [60, 100, 150], reward: 50 },
  deep: { text: n => `Dig down to ${n} m`, goals: [25, 40, 60], reward: 50 },
  copper: { text: n => `Collect ${n} copper`, goals: [5, 8, 12], reward: 40 },
  museum: { text: () => 'Give a find to the Museum', goals: [1], reward: 70 },
  bomb: { text: () => 'Throw a bomb', goals: [1], reward: 30 },
  charge: { text: () => 'Charge up on the charging pad', goals: [1], reward: 20 },
}

export const dayString = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const dayNumber = s => Math.round(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 86400000)

/* a seeded pick of three different quests for a day */
export function questsFor(day) {
  let h = 0; for (const c of day) h = (h * 31 + c.charCodeAt(0)) >>> 0
  const rnd = () => (h = (h * 1664525 + 1013904223) >>> 0) / 4294967296
  const keys = Object.keys(QUESTS).sort(() => rnd() - 0.5).slice(0, 3)
  return keys.map(id => { const Q = QUESTS[id]; const goal = Q.goals[Math.floor(rnd() * Q.goals.length)]; return { id, goal, have: 0, done: false } })
}

/* The day's state: a new day brings new quests, and a reward if not yet
   claimed. Returns { reward (or null), streakDay (1..7) }. Mutates `daily`. */
export function openDay(daily, today) {
  if (daily.day !== today) { daily.day = today; daily.quests = questsFor(today) }
  if (daily.last === today) return { reward: null, streakDay: daily.streak }
  const gap = daily.last ? dayNumber(today) - dayNumber(daily.last) : 99
  const streakDay = gap === 1 ? (daily.streak % 7) + 1 : 1
  return { reward: STREAK[streakDay - 1], streakDay }
}
export function claim(daily, today, streakDay) { daily.last = today; daily.streak = streakDay }

/* Count progress on quest `id` (by `n`, or to `n` for 'deep'); returns the
   quests just finished. */
export function progress(daily, id, n = 1) {
  const done = []
  for (const q of daily.quests || []) {
    if (q.id !== id || q.done) continue
    q.have = id === 'deep' ? Math.max(q.have, n) : q.have + n
    if (q.have >= q.goal) { q.have = q.goal; q.done = true; done.push(q) }
  }
  return done
}
export const questText = q => QUESTS[q.id].text(q.goal)
export const questReward = q => QUESTS[q.id].reward
