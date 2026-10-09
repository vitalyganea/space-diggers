/* Entry point. ?dev opens the dev level's index, ?dev=<name> one system's
   sandbox from src/dev/; otherwise the game. */
const dev = new URLSearchParams(location.search).get('dev')
const sandboxes = import.meta.glob('./dev/*.js')

if (dev === null) {
  import('./platform.js').then(async P => {
    const platform = await P.initPlatform()
    // the open game, or the race (its portal mode) with ?mode=race
    const race = new URLSearchParams(location.search).get('mode') === 'race'
    const m = race ? await import('./game.js') : await import('./open.js')
    m.start(platform)
  })
} else if (sandboxes[`./dev/${dev}.js`]) {
  sandboxes[`./dev/${dev}.js`]().then(m => m.start())
} else {
  import('./dev/index.js').then(m => m.start(Object.keys(sandboxes)))
}
