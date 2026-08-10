import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { VWorldMapProvider } from './Components/map'
import './styles/foundation/tokens.css'
import './styles/foundation/global.css'

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'))
}

const vWorldKey = import.meta.env.VITE_VWORLD_KEY?.trim()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <VWorldMapProvider apiKey={vWorldKey}>
      <App />
    </VWorldMapProvider>
  </StrictMode>,
)
