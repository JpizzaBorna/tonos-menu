/**
 * Light mode for old or slow devices (older iPads, smart-TV browsers, low-end phones).
 *
 * Turned on automatically when:
 *  - the browser is Safari 16 or older (iPads that cannot update further: A9/A10 chips and older), or
 *  - the device has 2 processor cores or fewer, or
 *  - the screen actually draws slowly: while the welcome screen is shown we time ~1.5 s of frames,
 *    and if they average under ~45 frames per second the menu switches to light mode for good.
 * Manual override, kept on the device: open tonos.website/?lite=1 (always light) or ?lite=0 (always full).
 *
 * Light mode (html.lite in index.css): solid tinted glass instead of live blur, no drifting background,
 * no picture shadows, and Motion keeps only fades (no blur / scale effects).
 */
const KEY = 'tonos-lite'
type Mode = 'on' | 'off' | 'auto-on' | null

const read = (): Mode => {
  try {
    return localStorage.getItem(KEY) as Mode
  } catch {
    return null
  }
}
const write = (v: Mode) => {
  try {
    if (v) localStorage.setItem(KEY, v)
    else localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

function oldSafari() {
  const ua = navigator.userAgent
  // iPhone / older iPad user agents carry the iOS version ("CPU OS 15_7 like Mac OS X"), whatever the browser app
  const ios = ua.match(/OS (\d+)_\d+(?:_\d+)? like Mac OS X/)
  if (ios) return Number(ios[1]) < 17
  // iPads on iPadOS 13+ show a Mac user agent: Safari's own version number follows the iPadOS version
  if (!/Safari/.test(ua) || /Chrome|Chromium|FxiOS|Edg|Android/.test(ua)) return false
  const m = ua.match(/Version\/(\d+)/)
  return !!m && Number(m[1]) < 17
}

// URL override (?lite=1 / ?lite=0 / ?lite=auto), remembered on this device
const q = new URLSearchParams(location.search).get('lite')
if (q === '1') write('on')
else if (q === '0') write('off')
else if (q === 'auto') write(null)

const saved = read()
let lite =
  saved === 'on' || saved === 'auto-on' || (saved !== 'off' && (oldSafari() || (navigator.hardwareConcurrency || 8) <= 2))

const listeners = new Set<() => void>()
const apply = () => {
  document.documentElement.classList.toggle('lite', lite)
  listeners.forEach((l) => l())
}
apply()

export const isLite = () => lite
export const subscribeLite = (l: () => void) => {
  listeners.add(l)
  return () => void listeners.delete(l)
}

/** Time the real frame rate for a moment; switch to light mode if the device struggles. */
export function probeFrameRate() {
  if (lite || saved === 'off' || document.hidden) return
  const times: number[] = []
  let last = 0
  const step = (t: number) => {
    if (document.hidden) return
    if (last) times.push(t - last)
    last = t
    if (times.length < 90) return void requestAnimationFrame(step)
    times.sort((a, b) => a - b)
    const typical = times[Math.floor(times.length * 0.5)]
    const slowFrames = times.filter((d) => d > 34).length / times.length
    if (typical > 22 || slowFrames > 0.2) {
      lite = true
      write('auto-on')
      apply()
    }
  }
  // wait for the first screen to settle (fonts, first images) before measuring
  setTimeout(() => requestAnimationFrame(step), 1500)
}
