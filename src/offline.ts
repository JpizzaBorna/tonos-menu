import { DATA, asset } from './data'

/**
 * Saves every menu photo on the device so the menu works with weak or no internet.
 *
 * Why not one big download: the old way saved ~65 MB in a single step; on weak Wi-Fi one dropped
 * file made the whole step start again. Now the app itself (code, fonts, logo, sound — a few MB) is
 * saved first, so the menu opens offline almost at once, and the photos follow one by one:
 *   1. the pictures shown in the lists (food from the top, drinks, shisha) — what guests see first
 *   2. the second angle shown when an item is opened
 * Every photo saved stays saved: if the connection drops, it continues later from where it stopped.
 * The service worker serves these saved photos (cache "tonos-media" / "tonos-photos").
 */

export const MEDIA_CACHE = 'tonos-media' // photos built into the app (media/…)
export const UPLOAD_CACHE = 'tonos-photos' // photos uploaded in the admin panel (Supabase)

export type Progress = { total: number; saved: number; done: boolean }
type Listener = (p: Progress) => void

let progress: Progress = { total: 0, saved: 0, done: false }
const listeners = new Set<Listener>()
const emit = () => listeners.forEach((l) => l(progress))
export function onProgress(l: Listener) {
  listeners.add(l)
  l(progress)
  return () => void listeners.delete(l)
}

/** All photo URLs, the ones guests see first at the front. */
function photoUrls() {
  const list: string[] = []
  const detail: string[] = []
  for (const m of DATA.menus)
    for (const c of m.categories)
      for (const i of c.items) {
        const first = i.images.top ?? i.images.main
        if (first) list.push(asset(first.src))
        for (const im of [i.images.side, i.images.main, i.images.top]) if (im && im !== first) detail.push(asset(im.src))
      }
  const abs = (u: string) => new URL(u, location.href).href
  return [...new Set([...list, ...detail].map(abs))]
}

/** How many photos to fetch at the same time: fewer on a slow connection so the visible ones are not starved. */
function parallel() {
  const t = (navigator as Navigator & { connection?: { effectiveType?: string; saveData?: boolean } }).connection
  if (t?.saveData) return 1
  if (t?.effectiveType === '4g') return 4
  if (t?.effectiveType === '3g') return 2
  if (t?.effectiveType) return 1
  return 3
}

async function saveOne(url: string, cache: Cache) {
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), 45_000)
  try {
    const remote = !url.startsWith(location.origin)
    const r = await fetch(url, { signal: ctl.signal, mode: remote ? 'cors' : 'same-origin', cache: 'no-cache' })
    if (!r.ok) throw new Error(String(r.status))
    await cache.put(url, r)
  } finally {
    clearTimeout(timer)
  }
}

let running = false
/** Start (or resume) saving. Safe to call many times. */
export async function saveMenuForOffline() {
  if (running || !('caches' in window) || import.meta.env.DEV) return
  running = true
  try {
    const urls = photoUrls()
    const media = await caches.open(MEDIA_CACHE)
    const uploads = await caches.open(UPLOAD_CACHE)
    const cacheFor = (u: string) => (u.startsWith(location.origin) ? media : uploads)
    const missing: string[] = []
    for (const u of urls) if (!(await cacheFor(u).match(u))) missing.push(u)
    progress = { total: urls.length, saved: urls.length - missing.length, done: missing.length === 0 }
    emit()

    let failed: string[] = []
    const queue = [...missing]
    const worker = async () => {
      for (let u = queue.shift(); u; u = queue.shift()) {
        try {
          await saveOne(u, cacheFor(u))
          progress = { ...progress, saved: progress.saved + 1 }
          emit()
        } catch {
          failed.push(u)
        }
      }
    }
    // a few rounds: anything that failed (weak Wi-Fi) is tried again a little later
    for (let round = 0; round < 4 && queue.length; round++) {
      await Promise.all(Array.from({ length: parallel() }, worker))
      if (failed.length) {
        queue.push(...failed)
        failed = []
        await new Promise((r) => setTimeout(r, 15_000 * (round + 1)))
      }
    }
    progress = { ...progress, done: queue.length === 0 }
    emit()
  } catch {
    /* storage blocked (private mode): the menu still works online */
  } finally {
    running = false
  }
  if (!progress.done) setTimeout(() => void saveMenuForOffline(), 60_000)
}

if (typeof window !== 'undefined') window.addEventListener('online', () => void saveMenuForOffline())
