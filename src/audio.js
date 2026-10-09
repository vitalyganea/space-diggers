/* Every sound, made on the spot with WebAudio: no audio files.

   The context starts on the first click or key (browsers allow sound only
   after one) and everything before that is dropped silently. `muted`
   silences all of it; M toggles it in the game, and a platform can mute it
   from outside (CrazyGames, row 13). `log` keeps the last events, for the
   tests, which cannot listen. */
export class Sound {
  constructor() {
    this.ctx = null
    this.master = null
    this.muted = false
    this.log = []
    this._noise = null
    const wake = () => this.start()
    window.addEventListener('pointerdown', wake, true)
    window.addEventListener('keydown', wake, true)
  }

  start() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return }
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return
    this.ctx = new AC()
    this.master = this.ctx.createGain()
    this.master.gain.value = this.muted ? 0 : 0.55
    this.master.connect(this.ctx.destination)
  }

  setMuted(m) {
    this.muted = m
    if (this.master) this.master.gain.value = m ? 0 : 0.55
  }

  /* one note: oscillator type, start and end pitch, length, volume */
  tone(type, f0, f1, len, vol = 0.3, delay = 0) {
    const c = this.ctx, t = c.currentTime + delay
    const o = c.createOscillator(), g = c.createGain()
    o.type = type
    o.frequency.setValueAtTime(f0, t)
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + len)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008)
    g.gain.exponentialRampToValueAtTime(0.0001, t + len)
    o.connect(g).connect(this.master)
    o.start(t); o.stop(t + len + 0.02)
  }

  /* a burst of filtered noise: crunch, hiss, rumble */
  noise(len, freq, vol = 0.3, delay = 0, q = 1) {
    const c = this.ctx, t = c.currentTime + delay
    if (!this._noise) {
      this._noise = c.createBuffer(1, c.sampleRate, c.sampleRate)
      const d = this._noise.getChannelData(0)
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
    }
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain()
    s.buffer = this._noise
    f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q
    g.gain.setValueAtTime(vol, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + len)
    s.connect(f).connect(g).connect(this.master)
    s.start(t, Math.random() * 0.5); s.stop(t + len + 0.02)
  }

  play(name, arg) {
    this.log.push(name)
    if (this.log.length > 50) this.log.shift()
    if (!this.ctx || this.muted || this.fxOff) return             // fxOff: sounds off in the settings, music may play on
    const S = SOUNDS[name]
    if (S) S(this, arg)
  }
}

/* What each event sounds like. `hard` is the block's hardness: softer
   blocks crunch higher, harder ones clank lower. */
const SOUNDS = {
  crack: (s, hard = 1) => s.noise(0.05, 900 / Math.sqrt(hard), 0.18, 0, 2),
  break: (s, hard = 1) => { s.noise(0.12, 700 / Math.sqrt(hard), 0.35); s.tone('square', 220 / hard + 80, 60, 0.08, 0.08) },
  coin: (s, n = 1) => { s.tone('triangle', 1318, 1318, 0.09, 0.22); s.tone('triangle', 1760, 1760, 0.14, 0.2, 0.07); if (n > 10) s.tone('triangle', 2349, 2349, 0.18, 0.18, 0.14) },
  fuse: s => s.noise(0.35, 5000, 0.08, 0, 0.7),
  boom: (s, near = 1) => { s.noise(0.9, 120, 0.9 * near, 0, 0.6); s.tone('sine', 110, 35, 0.6, 0.6 * near); s.noise(0.3, 1500, 0.3 * near) },
  place: s => { s.noise(0.08, 300, 0.3); s.tone('sine', 140, 70, 0.08, 0.2) },
  buy: s => { s.tone('square', 660, 660, 0.07, 0.12); s.tone('square', 990, 990, 0.12, 0.12, 0.07) },
  denied: s => s.tone('square', 180, 140, 0.15, 0.12),
  beep: s => s.tone('square', 660, 660, 0.12, 0.18),
  go: s => s.tone('square', 1320, 1320, 0.35, 0.2),
  win: s => [523, 659, 784, 1047].forEach((f, i) => s.tone('triangle', f, f, 0.22, 0.25, i * 0.12)),
  lose: s => [392, 330, 262].forEach((f, i) => s.tone('triangle', f, f * 0.98, 0.25, 0.2, i * 0.16)),
  thrown: s => s.tone('sine', 300, 600, 0.15, 0.12),
  low: s => { s.tone('square', 880, 880, 0.1, 0.15); s.tone('square', 660, 660, 0.14, 0.15, 0.14) },
  find: (s, tier = 0) => {                     // a rising run of notes, longer and higher the rarer the find
    const notes = [784, 988, 1175, 1568, 1976, 2349].slice(0, 2 + tier)
    notes.forEach((f, i) => s.tone('triangle', f, f, 0.16 + tier * 0.02, 0.16, i * 0.07))
    if (tier >= 4) s.noise(0.6, 6000, 0.08, 0.3, 0.5)
  },
  squeak: s => { s.tone('square', 2400, 3200, 0.06, 0.06); s.tone('square', 2800, 3600, 0.05, 0.05, 0.08) },
  rumble: s => s.noise(1.2, 90, 0.5, 0, 0.5),
  boing: s => s.tone('sine', 180, 520, 0.25, 0.25),
  whoosh: s => { s.noise(2.4, 400, 0.25, 0, 0.8); s.tone('sine', 900, 120, 2.4, 0.08) },
  flat: s => [440, 330, 220].forEach((f, i) => s.tone('sawtooth', f, f * 0.9, 0.18, 0.12, i * 0.15)),
}
