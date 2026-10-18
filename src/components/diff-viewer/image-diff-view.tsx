import { c } from '@/src/c.ts'
import { useImageDiffView } from '@/src/hooks/use-image-diff-view.ts'
import type { ImagePair } from '@/src/lib/image-files.ts'
import { ImagePane } from '@/src/components/diff-viewer/image-pane.tsx'

export function ImageDiffView({ images }: { images: ImagePair }) {
  const { panes, sideBySide } = useImageDiffView(images)

  return (
    <div className={c('grid gap-4 p-4', sideBySide ? 'grid-cols-2' : 'grid-cols-1')}>
      {panes.map((pane) => {
        return <ImagePane key={`${pane.tone}:${pane.src}`} {...pane} />
      })}
    </div>
  )
}
