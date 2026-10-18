import { useEffect } from 'react'
import { useAnnotationStore } from '@/src/store/annotation-store.ts'

const isEditable = (target: EventTarget | null) => {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')
  )
}

export const useSelectionEscape = () => {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || isEditable(event.target)) {
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
