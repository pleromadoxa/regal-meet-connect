import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { isSupabaseConfigured } from '@/integrations/supabase/client'

function showBootError(message: string) {
  const root = document.getElementById('root')
  if (!root) return
  root.innerHTML = `
    <div style="min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:24px;background:#0a0612;color:#fff;font-family:system-ui,sans-serif;text-align:center">
      <div style="max-width:22rem">
        <p style="font-size:1.25rem;font-weight:700;margin:0 0 8px">Regal Meeting</p>
        <p style="color:rgba(255,255,255,.65);font-size:.9rem;line-height:1.5;margin:0 0 16px">${message}</p>
        <button type="button" onclick="location.reload()" style="background:#ff6b35;color:#fff;border:none;border-radius:999px;padding:12px 20px;font-weight:600;cursor:pointer">Reload</button>
      </div>
    </div>
  `
}

function unregisterStaleServiceWorkers() {
  if (!('serviceWorker' in navigator)) return
  void navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((reg) => void reg.unregister())
  })
}

// Clear broken offline caches from earlier service worker versions
unregisterStaleServiceWorkers()

if (!isSupabaseConfigured) {
  showBootError(
    'This build is missing server configuration. Please try again in a moment or contact support if the issue persists.'
  )
} else {
  try {
    createRoot(document.getElementById('root')!).render(<App />)
  } catch (error) {
    console.error('Failed to start Regal Meeting:', error)
    showBootError(
      error instanceof Error ? error.message : 'The app failed to start. Tap reload to try again.'
    )
  }
}

// Re-register service worker after a successful boot (production only)
if (import.meta.env.PROD && isSupabaseConfigured && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => registration.update())
      .catch((err) => console.warn('SW registration failed:', err))
  })
}
