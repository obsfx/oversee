import { renderToReactElement } from '@tiptap/static-renderer'
import { useMemo } from 'react'
import { c } from '@/src/c.ts'
import { CommentMarkdown } from '@/src/lib/comment-markdown.ts'

export function MarkdownView({ body, className }: { body: string; className?: string }) {
  const rendered = useMemo(() => {
    return renderToReactElement({
      content: CommentMarkdown.parse(body),
      extensions: CommentMarkdown.renderExtensions,
    })
  }, [body])

  return <div className={c('comment-prose', className)}>{rendered}</div>
}
