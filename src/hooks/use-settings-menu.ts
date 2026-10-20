import { useState } from 'react'

export type SettingsView = 'overview' | 'interface' | 'editor' | 'diffColors' | 'languageServers'

export interface SettingsViewProps {
  navigate: (view: SettingsView) => void
}

export const useSettingsMenu = () => {
  const [view, navigate] = useState<SettingsView>('overview')

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      navigate('overview')
    }
  }

  return { view, navigate, handleOpenChange, wide: view === 'languageServers' }
}
