/* Row 50 check: daily rewards and quests (logic only).   node tests/daily.mjs */
import { openDay, claim, progress, questsFor, STREAK, questText } from '../src/daily.js'
let fails = 0
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++ }
const d = {}
let r = openDay(d, '2026-10-09')
ok(r.reward && r.streakDay === 1 && d.quests.length === 3, 'first day: day 1 reward, three quests')
claim(d, '2026-10-09', r.streakDay)
ok(openDay(d, '2026-10-09').reward === null, 'claimed: nothing more today')
r = openDay(d, '2026-10-10'); ok(r.streakDay === 2, 'the next day: day 2'); claim(d, '2026-10-10', 2)
r = openDay(d, '2026-10-12'); ok(r.streakDay === 1, 'a day missed: back to day 1')
let day = 1; const e = {}
for (let i = 0; i < 8; i++) { const t = `2026-11-${String(i + 1).padStart(2, '0')}`; const x = openDay(e, t); claim(e, t, x.streakDay); day = x.streakDay }
ok(day === 1 && STREAK[6].find, 'seven days in a row, then round again; day 7 brings a rare find')
ok(new Set(questsFor('2026-10-09').map(q => q.id)).size === 3, 'three different quests')
ok(JSON.stringify(questsFor('2026-10-09')) === JSON.stringify(questsFor('2026-10-09')) && JSON.stringify(questsFor('2026-10-09')) !== JSON.stringify(questsFor('2026-10-10')), 'the same three all day, different tomorrow')
const f = { quests: [{ id: 'dig', goal: 3, have: 0, done: false }, { id: 'deep', goal: 40, have: 0, done: false }] }
progress(f, 'dig'); progress(f, 'dig'); const done = progress(f, 'dig')
ok(done.length === 1 && f.quests[0].done, 'a quest counts up and finishes once')
progress(f, 'deep', 20); ok(!f.quests[1].done, 'depth counts the deepest, not a sum'); progress(f, 'deep', 45); ok(f.quests[1].done, '…and finishes at its depth')
ok(questText({ id: 'finds', goal: 2 }) === 'Find 2 treasures', 'quests read simply')
console.log(fails ? fails + ' failed' : 'all ok'); process.exit(fails ? 1 : 0)
