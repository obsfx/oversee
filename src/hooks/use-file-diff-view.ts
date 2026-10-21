import type { TabReveal } from '@/src/lib/definition-tabs.ts'
import { DiffLineReveal } from '@/src/lib/diff-line-reveal.ts'
import type { FileDiff } from '@/src/lib/file-diff-gateway.ts'
import { ParsedDiffs } from '@/src/lib/parsed-diffs.ts'
import { useCodeSurface } from '@/src/hooks/use-code-surface.ts'
import { useCommentFocus } from '@/src/hooks/use-comment-focus.ts'
import { useDiffAnnotations } from '@/src/hooks/use-diff-annotations.ts'
import { useDiffOptions } from '@/src/hooks/use-diff-options.ts'
import { useSelectionEscape } from '@/src/hooks/use-selection-escape.ts'

interface FileDiffViewOptions {
  reveal: TabReveal | null
  expandUnchanged: boolean
}

export const useFileDiffView = (
  path: string,
  diff: FileDiff,
  { reveal, expandUnchanged }: FileDiffViewOptions,
) => {
  const surface = useCodeSurface(path, reveal, {
    old: DiffLineReveal.lastLine(diff.oldFile?.contents),
    new: DiffLineReveal.lastLine(diff.newFile?.contents),
  })
  const options = useDiffOptions(path, {
    base: surface.base,
    onPostRender: surface.onPostRender,
    tokenHandlers: surface.tokenHandlers,
    expandUnchanged,
  })
  const { annotations, selectedLines } = useDiffAnnotations(path)
  useSelectionEscape()
  useCommentFocus(path, surface.rendered, surface.virtualizer)

  return {
    fileDiff: ParsedDiffs.of(path, diff),
    options,
    metrics: surface.metrics,
    annotations,
    selectedLines,
    revealing: surface.revealing,
    definition: surface.definition,
  }
}
