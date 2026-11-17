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
import App from './App.tsx'
import { applyLiveMenu, allPhotoUrls } from './data'
import { fetchLiveMenu } from './live'

// 1) get the menu published from the admin panel (offline: the saved copy; nothing at all: the built-in menu)
// 2) draw the app
// 3) quietly download any photos uploaded in the admin panel, so they also work offline
fetchLiveMenu(2500)
  .then((live) => applyLiveMenu(live))
  .catch(() => false)
  .then((usedLive) => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
    if (usedLive && navigator.onLine) {
      const remote = allPhotoUrls().filter((u) => /^https?:\/\//.test(u) && !u.startsWith(location.origin))
      remote.forEach((u, i) => setTimeout(() => void fetch(u, { mode: 'cors' }).catch(() => {}), 1500 + i * 150))
    }
  })
