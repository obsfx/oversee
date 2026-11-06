import { renderToReactElement } from '@tiptap/static-renderer'
import { useMemo } from 'react'
import { c } from '@/src/c.ts'
import { CommentMarkdown } from '@/src/lib/comment-markdown.ts'
import type { ReadingSize } from '@/src/lib/comment-reader-rules.ts'
import { CommentCodeBlock } from '@/src/components/comment-code-block.tsx'

const NODE_MAPPING = { codeBlock: CommentCodeBlock }

interface MarkdownViewProps {
  body: string
  size?: ReadingSize
  className?: string
}

export function MarkdownView({ body, size = 'compact', className }: MarkdownViewProps) {
  const rendered = useMemo(() => {
    return renderToReactElement({
      content: CommentMarkdown.parse(body),
      extensions: CommentMarkdown.renderExtensions,
      options: { nodeMapping: NODE_MAPPING },
    })
  }, [body])

  return (
    <div data-size={size} className={c('comment-prose', className)}>
      {rendered}
    </div>
  )
}
