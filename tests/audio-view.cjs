/* System 12 check: sounds, in the game. The test cannot listen, so it
   checks the AudioContext runs and that each event plays the sound it
   should (Sound.log).   node tests/audio-view.cjs */
const { launch, sleep } = require('../tools/cdp.cjs')
let fails = 0
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++ }
;(async () => {
  const p = await launch({ w: 1280, h: 720, port: 9395 })
  await p.navigate('http://localhost:5181/?seed=42'); await sleep(800)
  await p.tap(640, 360); await sleep(4500)          // the click starts the sound and locks the mouse
  const log = () => p.eval('__game.sound.log.slice()')
  const ctx = await p.eval('__game.sound.ctx && __game.sound.ctx.state')
  ok(ctx === 'running', `the first click starts the audio (${ctx})`)
  let l = await log()
  ok(l.filter(x => x === 'beep').length >= 2 && l.includes('go'), `the countdown beeps and the race starts with a go (${l.join(' ')})`)
  await p.eval('__game.noa.camera.pitch = 1.55'); await sleep(200)
  await p.mouseHold(640, 360, 1200); await sleep(200)
  l = await log()
  ok(l.includes('crack') && l.includes('break'), 'digging crackles and the block breaks with a pop')
  await p.eval('__game.digger.coins = 0'); await p.hold('Digit1', 60); await sleep(150)
  ok((await log()).at(-1) === 'denied', 'a purchase you cannot afford buzzes')
  await p.eval('__game.digger.coins = 99'); await p.hold('Digit1', 60); await sleep(150)
  ok((await log()).at(-1) === 'buy', 'one you can afford rings')
  await p.eval('__game.digger.bombs = 1; __game.noa.camera.pitch = -0.3'); await sleep(150)
  await p.hold('KeyQ', 60); await sleep(2600)
  l = await log()
  ok(l.includes('thrown') && l.includes('fuse') && l.includes('boom'), 'a bomb whooshes, hisses and booms')
  // real signal: an analyser on the master output hears the boom, not silence
  const level = () => p.eval(`(async () => { const s = __game.sound, a = s.ctx.createAnalyser(); a.fftSize = 2048
    s.master.connect(a); s.play('boom', 1); await new Promise(r => setTimeout(r, 120))
    const d = new Float32Array(a.fftSize); a.getFloatTimeDomainData(d); s.master.disconnect(a)
    return Math.sqrt(d.reduce((x, v) => x + v * v, 0) / d.length) })()`)
  const rms = await level()
  ok(rms > 0.01, `the boom is a real sound (output level ${rms.toFixed(3)})`)
  await p.hold('KeyM', 60); await sleep(150)
  const quiet = await level()
  ok(quiet < 0.001, `muted, the same boom is silent (${quiet.toFixed(4)})`)
  ok((await p.eval('__game.sound.muted')) && (await p.eval('__game.sound.master.gain.value')) === 0, 'M mutes everything')
  await p.hold('KeyM', 60); await sleep(150)
  ok(!(await p.eval('__game.sound.muted')) && (await p.eval('__game.sound.master.gain.value')) > 0, 'M again brings it back')
  await p.eval('__game.toCore()'); await sleep(1500)
  ok((await log()).at(-1) === 'win', 'winning plays the fanfare')
  ok(p.errors.length === 0, 'console clean ' + JSON.stringify(p.errors.slice(0, 3)))
  await p.close()
  console.log(fails ? `${fails} failed` : 'all ok'); process.exit(fails ? 1 : 0)
})()
