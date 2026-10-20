import { useState } from 'react'
import type { LanguageServer } from '@/src/lib/language-server-gateway.ts'
import { LanguageServerLabels } from '@/src/lib/language-server-labels.ts'

export const useRemoveLanguageServer = (server: LanguageServer, onRemove: () => void) => {
  const [confirmOpen, setConfirmOpen] = useState(false)

  return {
    label: LanguageServerLabels.action('remove'),
    title: LanguageServerLabels.removeTitle(server),
    description: LanguageServerLabels.removeDescription(server),
    confirmOpen,
    setConfirmOpen,
    confirm: () => {
      onRemove()
      setConfirmOpen(false)
    },
  }
}
