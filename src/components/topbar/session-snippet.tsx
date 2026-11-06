import { useSnippetHighlight } from '@/src/hooks/use-snippet-highlight.ts'
import type { SnapshotLine } from '@/src/lib/comment-gateway.ts'
import type { ReadingSize } from '@/src/lib/comment-reader-rules.ts'
import { CodeSnippetView } from '@/src/primitives/code-snippet-view.tsx'

interface SessionSnippetProps {
  lines: SnapshotLine[]
  filePath: string
  size?: ReadingSize
}

export function SessionSnippet({ lines, filePath, size }: SessionSnippetProps) {
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
      size={size}
    />
  )
}
