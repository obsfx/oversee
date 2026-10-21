import { useEffect } from 'react'
import { EditableTargets } from '@/src/lib/editable-targets.ts'
import { useAnnotationStore } from '@/src/store/annotation-store.ts'

export const useSelectionEscape = () => {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || EditableTargets.is(event.target)) {
        return
      }
      const { selection, select } = useAnnotationStore.getState()
      if (selection) {
        select(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])
}
