/**
 * Opening music for the logo intro (~10 s).
 * If app/public/sound/intro.mp3 exists it is played; otherwise a cinematic cue is synthesised with Web Audio,
 * timed to the intro: a riser while the emblem forms, a soft hit + harp sweep + strings as "TONOS" appears,
 * a bell melody, a lift to a new chord, and a final shimmering chord fading out by ~10 s.
 * iPad rule: audio is only allowed after a first touch, so call unlockAudio() from a tap once per page load.
 */
let ctx: AudioContext | null = null
let fileBuf: AudioBuffer | null | undefined // undefined = not checked yet, null = no file

function ac(): AudioContext | null {
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  ctx = ctx ?? new AC()
  return ctx
}

/** Call from a user tap. Unlocks audio for the rest of the session and preloads the optional mp3. */
export function unlockAudio() {
  const c = ac()
  if (!c) return
  if (c.state === 'suspended') void c.resume()
  // a silent tick: iOS unlocks only once a sound has started inside a gesture
  const o = c.createOscillator()
  const g = c.createGain()
  g.gain.value = 0
  o.connect(g).connect(c.destination)
  o.start()
  o.stop(c.currentTime + 0.02)
  if (fileBuf === undefined) {
    fileBuf = null
    fetch(import.meta.env.BASE_URL + 'sound/intro.mp3')
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject()))
      .then((b) => c.decodeAudioData(b))
      .then((b) => (fileBuf = b))
      .catch(() => (fileBuf = null))
  }
}

export const audioUnlocked = () => !!ctx && ctx.state === 'running'

export function playIntroMusic(volume = 0.6) {
  const c = ac()
  if (!c || c.state !== 'running') return
  try {
    if (fileBuf) {
      const s = c.createBufferSource()
      const g = c.createGain()
      g.gain.value = volume
      s.buffer = fileBuf
      s.connect(g).connect(c.destination)
      s.start()
      return
    }
    synthCue(c, volume)
  } catch {
    /* no audio: the intro still plays */
  }
}

/* ─────────────────────────── synthesised cue ─────────────────────────── */

const HZ = (n: string) => {
  // note name like 'D4', 'F#5'
  const m = /^([A-G])(#|b)?(\d)$/.exec(n)!
  const base = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 }[m[1] as 'C']!
  const semis = base + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (Number(m[3]) - 4) * 12
  return 440 * Math.pow(2, semis / 12)
}

function synthCue(c: AudioContext, volume: number) {
  const t0 = c.currentTime + 0.05
  const HIT = t0 + 1.1 // matches "TONOS" rising in the intro

  // master: gentle glue compression + long airy reverb
  const master = c.createGain()
  master.gain.value = volume
  const comp = c.createDynamicsCompressor()
  comp.threshold.value = -20
  comp.ratio.value = 2.5
  comp.attack.value = 0.02
  comp.release.value = 0.4
  master.connect(comp).connect(c.destination)
  const verb = c.createConvolver()
  verb.buffer = impulse(c, 4.5, 2.2)
  const wet = c.createGain()
  wet.gain.value = 0.5
  verb.connect(wet).connect(master)
  const send = (dry: number, rev = 1) => {
    const g = c.createGain()
    const d = c.createGain()
    d.gain.value = dry
    const r = c.createGain()
    r.gain.value = rev
    g.connect(d).connect(master)
    g.connect(r).connect(verb)
    return g
  }

  // 1) riser: filtered noise + rising sub, landing on the hit
  const nz = c.createBufferSource()
  nz.buffer = noise(c, 1.4)
  const hp = c.createBiquadFilter()
  hp.type = 'bandpass'
  hp.Q.value = 1.2
  hp.frequency.setValueAtTime(300, t0)
  hp.frequency.exponentialRampToValueAtTime(6000, HIT)
  const ng = c.createGain()
  ng.gain.setValueAtTime(0.0001, t0)
  ng.gain.exponentialRampToValueAtTime(0.22, HIT - 0.05)
  ng.gain.exponentialRampToValueAtTime(0.0001, HIT + 0.25)
  nz.connect(hp).connect(ng).connect(send(0.7, 0.6))
  nz.start(t0)
  nz.stop(HIT + 0.3)

  // 2) soft cinematic hit: sub drop + air
  const sub = c.createOscillator()
  sub.type = 'sine'
  sub.frequency.setValueAtTime(110, HIT)
  sub.frequency.exponentialRampToValueAtTime(38, HIT + 0.9)
  const sg = c.createGain()
  sg.gain.setValueAtTime(0.0001, HIT)
  sg.gain.exponentialRampToValueAtTime(0.55, HIT + 0.02)
  sg.gain.exponentialRampToValueAtTime(0.0001, HIT + 2.2)
  sub.connect(sg).connect(send(1, 0.25))
  sub.start(HIT)
  sub.stop(HIT + 2.3)

  // 3) strings: three chords, each a detuned saw ensemble through a warm low-pass
  const chords: [number, number, string[]][] = [
    [HIT, HIT + 3.7, ['D3', 'A3', 'D4', 'F#4', 'C#5', 'E5']], // Dmaj9
    [HIT + 3.5, HIT + 6.2, ['B2', 'F#3', 'D4', 'A4', 'E5', 'G5']], // Bm11 – the lift
    [HIT + 6.0, t0 + 10.2, ['D3', 'A3', 'F#4', 'A4', 'E5', 'B5']], // D6/9 – home, open
  ]
  chords.forEach(([a, b, notes], ci) => strings(c, send(0.55, 1), notes.map(HZ), a, b, ci === 0 ? 0.9 : 1.2))

  // 4) harp sweep up D major pentatonic on the hit
  const harp = ['D4', 'E4', 'F#4', 'A4', 'B4', 'D5', 'E5', 'F#5', 'A5', 'B5', 'D6', 'E6', 'F#6', 'A6']
  harp.forEach((n, i) => pluck(c, send(0.6, 0.9), HZ(n), HIT + 0.04 + i * 0.055, 0.07, 1.8))

  // 5) bell melody over the strings
  const mel: [string, number][] = [
    ['A5', 2.0], ['F#5', 2.35], ['D6', 2.7], ['C#6', 3.25], ['A5', 3.6],
    ['B5', 4.6], ['D6', 4.95], ['E6', 5.3], ['F#6', 6.1],
  ]
  mel.forEach(([n, at]) => bell(c, send(0.55, 1), HZ(n), HIT + at - 1.1, 0.085, 3.2))

  // 6) final shimmer as the last chord opens
  ;['A6', 'D7', 'E7', 'F#7'].forEach((n, i) => bell(c, send(0.35, 1.2), HZ(n), HIT + 6.0 + i * 0.09, 0.035, 4))
}

function strings(c: AudioContext, out: AudioNode, freqs: number[], start: number, end: number, attack: number) {
  const lp = c.createBiquadFilter()
  lp.type = 'lowpass'
  lp.Q.value = 0.7
  lp.frequency.setValueAtTime(700, start)
  lp.frequency.linearRampToValueAtTime(2200, start + attack + 1.2)
  const g = c.createGain()
  const peak = 0.05
  g.gain.setValueAtTime(0.0001, start)
  g.gain.exponentialRampToValueAtTime(peak, start + attack)
  g.gain.setValueAtTime(peak, Math.max(start + attack, end - 1.6))
  g.gain.exponentialRampToValueAtTime(0.0001, end)
  lp.connect(g).connect(out)
  freqs.forEach((f) =>
    [-9, 0, 8].forEach((det) => {
      const o = c.createOscillator()
      o.type = 'sawtooth'
      o.frequency.value = f
      o.detune.value = det
      // slow vibrato for a living ensemble
      const lfo = c.createOscillator()
      const lg = c.createGain()
      lfo.frequency.value = 4.6 + Math.random()
      lg.gain.value = 3
      lfo.connect(lg).connect(o.detune)
      o.connect(lp)
      o.start(start)
      lfo.start(start)
      o.stop(end + 0.1)
      lfo.stop(end + 0.1)
    }),
  )
}

function pluck(c: AudioContext, out: AudioNode, f: number, t: number, peak: number, decay: number) {
  const lp = c.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.setValueAtTime(f * 6, t)
  lp.frequency.exponentialRampToValueAtTime(f * 1.5, t + 0.4)
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(peak, t + 0.004)
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay)
  lp.connect(g).connect(out)
  ;([['triangle', 1, 1], ['sine', 2, 0.3]] as const).forEach(([type, m, a]) => {
    const o = c.createOscillator()
    o.type = type
    o.frequency.value = f * m
    const og = c.createGain()
    og.gain.value = a
    o.connect(og).connect(lp)
    o.start(t)
    o.stop(t + decay + 0.05)
  })
}

function bell(c: AudioContext, out: AudioNode, f: number, t: number, peak: number, decay: number) {
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(peak, t + 0.006)
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay)
  g.connect(out)
  ;[
    [1, 1],
    [2.0, 0.4],
    [2.76, 0.18],
    [5.4, 0.06],
  ].forEach(([m, a]) => {
    const o = c.createOscillator()
    o.type = 'sine'
    o.frequency.value = f * m
    const og = c.createGain()
    og.gain.value = a
    o.connect(og).connect(g)
    o.start(t)
    o.stop(t + decay + 0.05)
  })
}

function noise(c: AudioContext, secs: number) {
  const b = c.createBuffer(1, Math.floor(c.sampleRate * secs), c.sampleRate)
  const d = b.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  return b
}

function impulse(c: AudioContext, secs: number, decay: number) {
  const len = Math.floor(c.sampleRate * secs)
  const b = c.createBuffer(2, len, c.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay)
  }
  return b
}
