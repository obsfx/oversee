import { useState } from 'react'
import { useServices } from '@/src/context/services/use-services.ts'
import { useAsyncAction } from '@/src/hooks/use-async-action.ts'
import { useComments } from '@/src/hooks/use-comments.ts'

export const useFinishReview = () => {
  const { sessions } = useServices()
  const { comparison, list, countLabel } = useComments()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const active = list.length > 0
  const action = useAsyncAction(async () => {
    if (comparison && active) {
      await sessions.finish(comparison)
      setConfirmOpen(false)
    }
  })

  const changeConfirmOpen = (open: boolean) => {
    setConfirmOpen(open)
    if (!open) {
      action.reset()
    }
  }

  return {
    active,
    finishing: action.pending,
    failed: action.failed,
    finish: action.run,
    summary: `${countLabel} will move to Sessions.`,
    confirmOpen,
    setConfirmOpen: changeConfirmOpen,
  }
}
