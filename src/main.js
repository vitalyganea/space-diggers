/* Entry point. ?dev opens the dev level's index, ?dev=<name> one system's
   sandbox from src/dev/; otherwise the game. */
const dev = new URLSearchParams(location.search).get('dev')
const sandboxes = import.meta.glob('./dev/*.js')

if (dev === null) {
  import('./platform.js').then(async P => {
    const platform = await P.initPlatform()
    const m = await import('./game.js')
    m.start(platform)
  })
} else if (sandboxes[`./dev/${dev}.js`]) {
  sandboxes[`./dev/${dev}.js`]().then(m => m.start())
} else {
  import('./dev/index.js').then(m => m.start(Object.keys(sandboxes)))
}
