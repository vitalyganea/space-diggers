/* The site the game runs on, behind one small interface. On CrazyGames
   (whose SDK v3 only the CrazyGames build loads, see build-crazygames.sh)
   every call goes to the SDK; anywhere else they do nothing and the save
   is plain localStorage.

     loadingStart / loadingStop  while the first world is built
     gameplayStart / gameplayStop  exactly while the player is playing
     happytime()                 a win
     midgameAd()                 a Promise that settles when any ad is over
                                 (or refused, or stuck for 60 s)
     storage                     getItem / setItem, for meta.load / store
     onMute(cb)                  the site's own sound switch */

const local = {
  getItem: k => { try { return localStorage.getItem(k) } catch (e) { return null } },
  setItem: (k, v) => { try { localStorage.setItem(k, v) } catch (e) { /* private mode */ } },
}

const none = {
  name: 'web',
  loadingStart() {}, loadingStop() {}, gameplayStart() {}, gameplayStop() {}, happytime() {},
  midgameAd: () => Promise.resolve('none'),
  storage: local,
  onMute() {},
}

export async function initPlatform() {
  const CG = window.CrazyGames && window.CrazyGames.SDK
  if (!CG || !CG.init) return none
  try { await CG.init() } catch (e) { return none }
  if (CG.environment === 'disabled') return none
  return crazy(CG)
}

function crazy(sdk) {
  const say = m => { try { console.info('[Boom Diggers] ' + m) } catch (e) { /* no console */ } }
  const safe = f => { try { return f() } catch (e) { say('SDK call failed: ' + e) } }
  let playing = false
  return {
    name: 'crazygames',
    loadingStart: () => safe(() => sdk.game.loadingStart()),
    loadingStop: () => safe(() => sdk.game.loadingStop()),
    gameplayStart() { if (!playing) { playing = true; safe(() => sdk.game.gameplayStart()) } },
    gameplayStop() { if (playing) { playing = false; safe(() => sdk.game.gameplayStop()) } },
    happytime: () => safe(() => sdk.game.happytime()),
    midgameAd() {
      return new Promise(resolve => {
        let done = false
        const end = how => { if (!done) { done = true; say('midgame ad: ' + how); resolve(how) } }
        say('midgame ad: requested')
        try {
          sdk.ad.requestAd('midgame', {
            adStarted: () => say('midgame ad: started'),
            adFinished: () => end('finished'),
            adError: err => end('refused (' + (err && (err.code || err.message) || err) + ')'),
          })
        } catch (e) { end('could not be asked (' + e + ')') }
        setTimeout(() => end('timed out'), 60000)   // never strand a player behind a stuck ad
      })
    },
    // the save follows a logged-in player between devices; localStorage mirrors it
    storage: {
      getItem: k => safe(() => sdk.data.getItem(k)) ?? local.getItem(k),
      setItem: (k, v) => { local.setItem(k, v); safe(() => sdk.data.setItem(k, v)) },
    },
    onMute(cb) {
      const read = () => cb(!!safe(() => sdk.game.settings && sdk.game.settings.muteAudio))
      read()
      safe(() => sdk.game.addSettingsChangeListener(read))
    },
  }
}
