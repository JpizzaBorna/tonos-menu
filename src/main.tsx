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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
