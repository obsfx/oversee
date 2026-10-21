import { useSnippetHighlight } from '@/src/hooks/use-snippet-highlight.ts'
import type { SnapshotLine } from '@/src/lib/comment-gateway.ts'
import { CodeSnippetView } from '@/src/primitives/code-snippet-view.tsx'

interface SessionSnippetProps {
  lines: SnapshotLine[]
  filePath: string
}

export function SessionSnippet({ lines, filePath }: SessionSnippetProps) {
  const highlighted = useSnippetHighlight(lines, filePath)
  if (lines.length === 0) {
    return null
  }

  return (
    <CodeSnippetView
      lines={highlighted.lines}
      background={highlighted.background}
      foreground={highlighted.foreground}
      gutterWidth={highlighted.gutterWidth}
    />
  )
}
