import { VscError, VscFileBinary } from 'react-icons/vsc'
import { c } from '@/src/c.ts'
import { useFileDiff } from '@/src/hooks/use-file-diff.ts'
import { Button } from '@/src/primitives/button.tsx'
import { CenteredStatus } from '@/src/primitives/centered-status.tsx'
import { LoadingBar } from '@/src/primitives/loading-bar.tsx'
import { FileDiffView } from '@/src/components/diff-viewer/file-diff-view.tsx'
import { ImageDiffView } from '@/src/components/diff-viewer/image-diff-view.tsx'
import { VirtualizedScroller } from '@/src/components/diff-viewer/virtualized-scroller.tsx'

export function DiffViewer() {
  const { state, shown, loading, retry } = useFileDiff()

  if (state.status === 'failed') {
    return (
      <CenteredStatus icon={<VscError />}>
        <span>Could not load this diff</span>
        <Button onClick={retry}>Retry</Button>
      </CenteredStatus>
    )
  }

  const surface = c(
    'h-full overflow-auto transition-opacity duration-150',
    loading && 'pointer-events-none opacity-50',
  )

  return (
    <div className={'relative h-full'}>
      {loading && <LoadingBar />}
      {shown && !shown.diff.binary && (
        <VirtualizedScroller className={surface}>
          <FileDiffView path={shown.path} diff={shown.diff} />
        </VirtualizedScroller>
      )}
      {shown?.diff.binary && (
        <div className={surface}>
          {shown.diff.images ? (
            <ImageDiffView images={shown.diff.images} />
          ) : (
            <CenteredStatus icon={<VscFileBinary />}>Binary file not shown</CenteredStatus>
          )}
        </div>
      )}
    </div>
  )
}
