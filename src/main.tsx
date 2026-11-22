import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Fonts bundled locally (no Google Fonts request) so the menu looks right offline
import '@fontsource/great-vibes/400.css'
import '@fontsource/playfair-display/400-italic.css'
import '@fontsource/playfair-display/500-italic.css'
import '@fontsource/outfit/200.css'
import '@fontsource/outfit/300.css'
import '@fontsource/outfit/400.css'
import '@fontsource/outfit/500.css'
import '@fontsource/outfit/600.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import './index.css'
import './perf' // light mode for old / slow devices: decided before the first frame
import App from './App.tsx'
import { applyLiveMenu } from './data'
import { fetchLiveMenu } from './live'

// Start-up, fast even on weak internet:
// 1) the last published menu saved on this device is used at once (first visit ever: wait up to 2.5 s for it)
// 2) draw the app
// 3) in the background, check for a newer menu (now and every 10 minutes). A newer one is saved and shown
//    when the waiter resets the menu for the next guest (never in the middle of a guest's order).
// 4) the photos are saved for offline in the background (see offline.ts, started by OfflineStatus)
const KEY = 'tonos-live-menu'
const readSaved = () => {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}
const save = (json: string) => {
  try {
    localStorage.setItem(KEY, json)
  } catch {
    /* storage full / blocked: fine, the service worker still has a copy */
  }
}

async function refresh() {
  if (!navigator.onLine) return
  const live = await fetchLiveMenu(15000)
  if (!live) return
  const json = JSON.stringify(live)
  if (json !== readSaved()) {
    save(json)
    ;(window as Window & { tonosMenuUpdated?: boolean }).tonosMenuUpdated = true
  }
}

async function start() {
  const saved = readSaved()
  if (saved) {
    try {
      applyLiveMenu(JSON.parse(saved))
    } catch {
      /* broken copy: use the built-in menu */
    }
  } else {
    const live = await fetchLiveMenu(2500)
    if (applyLiveMenu(live)) save(JSON.stringify(live))
  }
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
  if (saved) setTimeout(() => void refresh(), 3000)
  setInterval(() => void refresh(), 10 * 60 * 1000)
}
void start()
