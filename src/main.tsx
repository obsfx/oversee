import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/src/index.css'
import { App } from '@/src/App.tsx'
import { appServices } from '@/src/lib/app-services.ts'
import { useSettingsStore } from '@/src/store/settings-store.ts'

void appServices.settings.start(useSettingsStore).then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
