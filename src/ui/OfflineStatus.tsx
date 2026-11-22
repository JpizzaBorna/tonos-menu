import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { onProgress, saveMenuForOffline, type Progress } from '../offline'

/**
 * Small glass pill (bottom centre) while the menu saves its photos to the device:
 * "Saving menu for offline… 45%" → "Ready offline ✓" (then it fades away).
 * When everything is already saved (every later visit), nothing is shown at all.
 * Also asks the browser to keep the saved files permanently.
 */
export function OfflineStatus() {
  const [p, setP] = useState<Progress | null>(null)
  const [hidden, setHidden] = useState(false)
  const [sawProgress, setSawProgress] = useState(false)

  useEffect(() => {
    if (!('caches' in window) || import.meta.env.DEV) return
    void navigator.storage?.persist?.().catch(() => {})
    const off = onProgress((next) => {
      if (!next.total) return
      setP(next)
      if (!next.done) setSawProgress(true)
    })
    // let the first screen draw and the app files arrive before photos start downloading
    const t = window.setTimeout(() => void saveMenuForOffline(), 1200)
    return () => {
      off()
      window.clearTimeout(t)
    }
  }, [])

  useEffect(() => {
    if (!p?.done) return
    if (!sawProgress) return setHidden(true)
    const t = window.setTimeout(() => setHidden(true), 3500)
    return () => window.clearTimeout(t)
  }, [p?.done, sawProgress])

  const pct = p ? Math.min(99, Math.floor((p.saved / Math.max(1, p.total)) * 100)) : 0
  const show = !hidden && !!p && (sawProgress || !p.done)
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
          {p!.done ? (
            <>Ready offline ✓</>
          ) : (
            <>
              <span className="offline-pill__bar">
                <span style={{ width: `${pct}%` }} />
              </span>
              Saving menu for offline… {pct}%
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
