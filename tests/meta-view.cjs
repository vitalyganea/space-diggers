/* System 11 check in the game: a round pays, the shop sells an animal, the
   next round digs as it, and all of it survives a reload.   node tests/meta-view.cjs */
const { launch, sleep } = require('../tools/cdp.cjs')
const OUT = process.env.OUT || '/tmp/boom-tests'
let fails = 0
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++ }
const click = (p, sel) => p.eval(`document.querySelector('${sel}').click()`)
;(async () => {
  const p = await launch({ w: 1280, h: 720, port: 9394 })
  await p.navigate('http://localhost:5181/?seed=42'); await sleep(5000)
  ok((await p.eval('__game.save.chosen')) === 'mole' && (await p.eval('__game.digger.bombs')) === 0, 'a new player digs as the mole')
  await p.eval('__game.digger.coins = 7; __game.toCore()'); await sleep(1500)
  const pay = await p.eval(`document.querySelector('.results .pay').textContent.replace(/\\s+/g, ' ').trim()`)
  ok(/\+106/.test(pay) && /7 kept, 50 for your place, 49 for depth/.test(pay), `the round pays 7 + 50 + 49 (${pay})`)
  ok((await p.eval('JSON.parse(localStorage.getItem("boomdiggers-save-v1")).coins')) === 106, 'and the save has it')
  await p.eval('__game.save.coins = 1000')
  await click(p, '.results .animals'); await sleep(300)
  const cards = await p.eval(`[...document.querySelectorAll('.animals-shop .animal')].map(a => a.querySelector('h3').textContent + ':' + a.querySelector('button').textContent.trim() + ':' + a.querySelector('button').disabled)`)
  ok(cards.length === 3 && /Mole:Digging:true/.test(cards[0]) && /Beaver:300:false/.test(cards[1]), `three animals, the mole in use (${cards.join(' | ')})`)
  ok(await p.eval(`document.querySelectorAll('.animals-shop canvas').length === 3`), 'each with its portrait')
  await p.shot(OUT + '/m1-shop.png')
  await click(p, '.animals-shop .buy[data-k="beaver"]'); await sleep(300)
  const sv = await p.eval('JSON.parse(localStorage.getItem("boomdiggers-save-v1"))')
  ok(sv.coins === 700 && sv.owned.includes('beaver') && sv.chosen === 'beaver', `buying the beaver: 700 left, owned, chosen (${JSON.stringify(sv)})`)
  await click(p, '.animals-shop .close'); await sleep(300)
  ok(/You have 700/.test(await p.eval(`document.querySelector('.results .bank').textContent.replace(/\\s+/g, ' ')`)), 'back on the results card, the purse shows 700')
  ok(await p.eval(`!!document.querySelector('.results .animals')`), 'and Animals is still there')
  await click(p, '.results .again'); await sleep(5000)
  const next = await p.eval('({ chosen: __game.save.chosen, bombs: __game.digger.bombs, stock: __game.digger.stock, coins: __game.save.coins })')
  ok(next.chosen === 'beaver' && next.bombs === 1 && next.stock === 10 && next.coins === 700, `the next round: beaver, a bomb and 10 blocks to start (${JSON.stringify(next)})`)
  ok(p.errors.length === 0, 'console clean ' + JSON.stringify(p.errors.slice(0, 3)))
  await p.close()
  console.log(fails ? `${fails} failed` : 'all ok'); process.exit(fails ? 1 : 0)
})()
