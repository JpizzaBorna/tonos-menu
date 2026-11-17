import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'

/**
 * Small glass pill (bottom centre) while the menu saves itself to the iPad on the first visit:
 * "Saving menu for offline… 45%" → "Ready offline ✓" (then it fades away). On later visits everything
 * is already saved, so nothing is shown. Also asks the browser to keep the saved files permanently.
 */
export function OfflineStatus() {
  const [pct, setPct] = useState<number | null>(null)
  const [done, setDone] = useState(false)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('caches' in window) || import.meta.env.DEV) return
    void navigator.storage?.persist?.().catch(() => {})
    let total = 0
    let alive = true
    let sawProgress = false // true once we showed "Saving…" this visit
    let timer: number | undefined

    const count = async () => {
      let n = 0
      for (const k of await caches.keys()) if (k.includes('precache')) n += (await (await caches.open(k)).keys()).length
      return n
    }
    const tick = async () => {
      if (!alive) return
      try {
        if (!total) {
          const sw = await fetch('./sw.js', { cache: 'no-store' }).then((r) => r.text())
          total = (sw.match(/url:"/g) || []).length
        }
        const n = await count()
        const reg = await navigator.serviceWorker.getRegistration()
        // the worker only becomes active after EVERY file is saved, so "active, nothing installing" = fully offline-ready
        const ready = !!reg?.active && !reg.installing && !reg.waiting
        if (ready) {
          setDone(true)
          // first visit: show "ready" for a moment; already-saved visits: never show anything
          if (!sawProgress) setHidden(true)
          else timer = window.setTimeout(() => setHidden(true), 3500)
          return
        }
        if (total) {
          sawProgress = true
          setPct(Math.min(99, Math.round((n / total) * 100)))
        }
      } catch {
        /* offline or not ready yet: try again */
      }
      timer = window.setTimeout(tick, 1000)
    }
    void tick()
    return () => {
      alive = false
      window.clearTimeout(timer)
    }
  }, [])

  const show = !hidden && (pct !== null || done)
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="offline-pill glass glass--dark"
          role="status"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
        >
          {done ? (
            <>Ready offline ✓</>
          ) : (
            <>
              <span className="offline-pill__bar">
                <span style={{ width: `${pct ?? 0}%` }} />
              </span>
              Saving menu for offline… {pct ?? 0}%
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
