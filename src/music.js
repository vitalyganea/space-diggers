/* Background music (row 41), made on the spot like every other sound: a
   slow pad of chords and a few bell notes over it, picked from the theme's
   scale. Three themes, each in its own key, tempo and voice:
     surface      bright bells over a warm pad, C major, 72 a minute
     deep         a dark drone and sparse low plucks, A minor, 56 a minute
     menu         a calm, open pad, D, 64 a minute
   It plays through the game's master volume, so muting (M, an ad, the
   platform) silences it too. The theme changes at the next bar, so it
   never cuts off mid-chord. */
const A4 = 440
export const note = n => A4 * Math.pow(2, (n - 69) / 12)      // MIDI number to Hz

export const THEMES = {
  surface: { bpm: 72, chords: [[48, 52, 55, 59], [45, 48, 52, 55], [41, 45, 48, 52], [43, 47, 50, 54]], scale: [72, 74, 76, 79, 81, 84], bell: 'triangle', pad: 'triangle', cut: 1400, bells: 0.55 },
  deep: { bpm: 56, chords: [[45, 52, 57, 60], [41, 48, 53, 57], [38, 45, 50, 53], [40, 47, 52, 56]], scale: [57, 60, 62, 64, 67], bell: 'sine', pad: 'sine', cut: 650, bells: 0.3 },
  menu: { bpm: 64, chords: [[50, 57, 62, 66], [43, 50, 55, 59], [45, 52, 57, 61], [47, 54, 59, 62]], scale: [74, 76, 78, 81, 83], bell: 'sine', pad: 'triangle', cut: 1000, bells: 0.4 },
}
const VOLUME = 0.32

export class Music {
  constructor(sound) {
    this.sound = sound
    this.theme = null; this.want = null
    this.bar = 0; this.nextBar = 0
    this.bus = null
    this.played = 0                         // notes scheduled, for the tests
    this.timer = null
  }
  /* which theme should play; it takes over at the next bar */
  play(name) { this.want = name; if (!this.timer) this.timer = setInterval(() => this.tick(), 200) }
  stop() { this.want = null }

  tick() {
    const c = this.sound.ctx
    if (!c || c.state !== 'running') return
    if (!this.bus) { this.bus = c.createGain(); this.bus.gain.value = VOLUME; this.bus.connect(this.sound.master); this.nextBar = c.currentTime + 0.1 }
    while (this.nextBar < c.currentTime + 1.2) {
      this.theme = this.want
      if (this.theme) this.scheduleBar(THEMES[this.theme], this.nextBar)
      const T = THEMES[this.theme || 'menu']
      this.nextBar += 4 * 60 / T.bpm
      this.bar++
    }
  }

  scheduleBar(T, t) {
    const c = this.sound.ctx, beat = 60 / T.bpm, len = beat * 4
    const chord = T.chords[this.bar % T.chords.length]
    // the pad: each chord note, two slightly detuned voices through a soft low-pass
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = T.cut; f.connect(this.bus)
    for (const n of chord) for (const det of [-4, 4]) {
      const o = c.createOscillator(), g = c.createGain()
      o.type = T.pad; o.frequency.value = note(n); o.detune.value = det
      g.gain.setValueAtTime(0.0001, t)
      g.gain.linearRampToValueAtTime(0.05, t + len * 0.35)
      g.gain.linearRampToValueAtTime(0.0001, t + len * 1.05)
      o.connect(g).connect(f); o.start(t); o.stop(t + len * 1.1)
      this.played++
    }
    // bells: a few notes on the beats, each with a soft echo
    for (let b = 0; b < 4; b++) {
      if (Math.random() > T.bells) continue
      const n = T.scale[Math.floor(Math.random() * T.scale.length)], at = t + b * beat + (Math.random() < 0.3 ? beat / 2 : 0)
      for (const [d, v] of [[0, 0.09], [beat * 0.75, 0.035]]) {
        const o = c.createOscillator(), g = c.createGain()
        o.type = T.bell; o.frequency.value = note(n)
        g.gain.setValueAtTime(0.0001, at + d)
        g.gain.exponentialRampToValueAtTime(v, at + d + 0.01)
        g.gain.exponentialRampToValueAtTime(0.0001, at + d + beat * 1.6)
        o.connect(g).connect(this.bus); o.start(at + d); o.stop(at + d + beat * 1.7)
        this.played++
      }
    }
  }
}
