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
     onMute(cb)                  the site's own sound switch
     hasAds / rewardedAd()       a rewarded ad: a Promise of true if it was
                                 watched to the end. The plain web has none,
                                 except ?fakeads=1, a stand-in for the tests. */

const local = {
  getItem: k => { try { return localStorage.getItem(k) } catch (e) { return null } },
  setItem: (k, v) => { try { localStorage.setItem(k, v) } catch (e) { /* private mode */ } },
}

const fakeAds = typeof location !== 'undefined' && new URLSearchParams(location.search).has('fakeads')

/* The stand-in rewarded ad: a dark card for 1.5 s, then paid. */
function fakeRewarded() {
  return new Promise(resolve => {
    const el = document.createElement('div')
    el.className = 'overlay fake-ad'
    el.innerHTML = '<div class="card panel"><h1>AD</h1><h2>(a stand-in for a rewarded ad)</h2></div>'
    document.body.appendChild(el)
    setTimeout(() => { el.remove(); resolve(true) }, 1500)
  })
}

const none = {
  name: 'web',
  loadingStart() {}, loadingStop() {}, gameplayStart() {}, gameplayStop() {}, happytime() {},
  midgameAd: () => Promise.resolve('none'),
  hasAds: fakeAds,
  rewardedAd: () => fakeAds ? fakeRewarded() : Promise.resolve(false),
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
  const say = m => { try { console.info('[Space Diggers] ' + m) } catch (e) { /* no console */ } }
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
    hasAds: true,
    rewardedAd() {
      return new Promise(resolve => {
        let done = false
        const end = (ok, how) => { if (!done) { done = true; say('rewarded ad: ' + how); resolve(ok) } }
        say('rewarded ad: requested')
        try {
          sdk.ad.requestAd('rewarded', {
            adStarted: () => say('rewarded ad: started'),
            adFinished: () => end(true, 'finished'),
            adError: err => end(false, 'refused (' + (err && (err.code || err.message) || err) + ')'),
          })
        } catch (e) { end(false, 'could not be asked (' + e + ')') }
        setTimeout(() => end(false, 'timed out'), 60000)
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
