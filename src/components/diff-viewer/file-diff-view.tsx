import { FileDiff as PierreFileDiff } from '@pierre/diffs/react'
import { useFileDiffView } from '@/src/hooks/use-file-diff-view.ts'
import type { TabReveal } from '@/src/lib/definition-tabs.ts'
import type { FileDiff } from '@/src/lib/file-diff-gateway.ts'
import { DiffSurface } from '@/src/lib/diff-surface.ts'
import { DefinitionPopover } from '@/src/components/definitions/definition-popover.tsx'
import { LoadingBar } from '@/src/primitives/loading-bar.tsx'
import { DiffAnnotation } from '@/src/components/diff-viewer/diff-annotation.tsx'

interface FileDiffViewProps {
  path: string
  diff: FileDiff
  reveal?: TabReveal | null
  expandUnchanged?: boolean
}

export function FileDiffView({
  path,
  diff,
  reveal = null,
  expandUnchanged = false,
}: FileDiffViewProps) {
  const { fileDiff, options, metrics, annotations, selectedLines, revealing, definition } =
    useFileDiffView(path, diff, { reveal, expandUnchanged })

  return (
    <>
      {revealing && <LoadingBar />}
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
      <DefinitionPopover {...definition} />
    </>
  )
}
