import { DiffThemeCatalog } from '@/src/lib/diff-theme-catalog.ts'
import type { SnapshotLine } from '@/src/lib/comment-gateway.ts'
import { SnippetHighlighter } from '@/src/lib/snippet-highlighter.ts'
import { useDiffTheme } from '@/src/hooks/use-diff-theme.ts'
import { useKeyedPromise } from '@/src/hooks/use-keyed-promise.ts'

export const useSnippetHighlight = (lines: SnapshotLine[], filePath: string) => {
  const { themes, themeType } = useDiffTheme()
  const theme = DiffThemeCatalog.resolvedName(themes, themeType)
  const highlighted = useKeyedPromise({
    key: SnippetHighlighter.key(lines, filePath, theme),
    load: () => {
      return SnippetHighlighter.highlight(lines, filePath, theme)
    },
  })
  const current = highlighted.status === 'ready' ? highlighted.value : null

  return {
    lines: SnippetHighlighter.viewLines(lines, current),
    background: current?.background,
    foreground: current?.foreground,
    gutterWidth: SnippetHighlighter.gutterWidth(lines),
  }
}
