import { useEffect, useState } from 'react'
import { DiffThemeCatalog } from '@/src/lib/diff-theme-catalog.ts'
import type { SnapshotLine } from '@/src/lib/review-session-gateway.ts'
import { type HighlightedSnippet, SnippetHighlighter } from '@/src/lib/snippet-highlighter.ts'
import { useDiffTheme } from '@/src/hooks/use-diff-theme.ts'

interface KeyedSnippet {
  key: string
  snippet: HighlightedSnippet
}

export const useSnippetHighlight = (lines: SnapshotLine[], filePath: string) => {
  const { themes, themeType } = useDiffTheme()
  const theme = DiffThemeCatalog.resolvedName(themes, themeType)
  const key = SnippetHighlighter.key(lines, filePath, theme)
  const [highlighted, setHighlighted] = useState<KeyedSnippet | null>(null)

  useEffect(() => {
    let cancelled = false
    void SnippetHighlighter.highlight(lines, filePath, theme).then((snippet) => {
      if (!cancelled) {
        setHighlighted({ key, snippet })
      }
    })
    return () => {
      cancelled = true
    }
  }, [lines, filePath, theme, key])

  const current = highlighted?.key === key ? highlighted.snippet : null

  return {
    lines: SnippetHighlighter.viewLines(lines, current),
    background: current?.background,
    foreground: current?.foreground,
  }
}
