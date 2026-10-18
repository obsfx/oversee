import { FileDiff as PierreFileDiff } from '@pierre/diffs/react'
import { useFileDiffView } from '@/src/hooks/use-file-diff-view.ts'
import type { FileDiff } from '@/src/lib/file-diff-gateway.ts'
import { DiffSurface } from '@/src/lib/diff-surface.ts'
import { DiffAnnotation } from '@/src/components/diff-viewer/diff-annotation.tsx'

interface FileDiffViewProps {
  path: string
  diff: FileDiff
}

export function FileDiffView({ path, diff }: FileDiffViewProps) {
  const { fileDiff, options, metrics, annotations, selectedLines } = useFileDiffView(path, diff)

  return (
    <PierreFileDiff
      fileDiff={fileDiff}
      options={options}
      metrics={metrics}
      lineAnnotations={annotations}
      selectedLines={selectedLines}
      style={DiffSurface.style}
      className={'block'}
      renderAnnotation={(annotation) => {
        return <DiffAnnotation path={path} meta={annotation.metadata} />
      }}
    />
  )
}
