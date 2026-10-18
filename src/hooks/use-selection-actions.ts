import { LineRanges, type LineRange } from '@/src/lib/line-range.ts'
import { useAnnotationStore } from '@/src/store/annotation-store.ts'

export const useSelectionActions = (path: string, range: LineRange) => {
  const openDraft = useAnnotationStore((state) => {
    return state.openDraft
  })
  const select = useAnnotationStore((state) => {
    return state.select
  })

  return {
    label: `Comment on ${LineRanges.label(range).toLowerCase()}`,
    comment: () => {
      openDraft({ path, range, commentId: null })
    },
    clear: () => {
      select(null)
    },
  }
}
