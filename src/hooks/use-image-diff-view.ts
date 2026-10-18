import type { ImagePair } from '@/src/lib/image-files.ts'
import type { ImageTone } from '@/src/primitives/image-caption.tsx'
import { useDiffViewStore } from '@/src/store/diff-view-store.ts'

export interface ImagePaneModel {
  tone: ImageTone
  label: string
  src: string
}

export const useImageDiffView = ({ before, after }: ImagePair) => {
  const viewMode = useDiffViewStore((state) => {
    return state.viewMode
  })
  const both = before !== null && after !== null
  const panes: ImagePaneModel[] = []
  if (before) {
    panes.push({ tone: 'before', label: both ? 'Before' : 'Deleted', src: before })
  }
  if (after) {
    panes.push({ tone: 'after', label: both ? 'After' : 'Added', src: after })
  }

  return { panes, sideBySide: both && viewMode === 'split' }
}
