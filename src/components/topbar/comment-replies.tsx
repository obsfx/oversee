import { useNow } from '@/src/hooks/use-now.ts'
import { CommentMarkdown } from '@/src/lib/comment-markdown.ts'
import { RelativeTime } from '@/src/lib/relative-time.ts'
import type { CommentReply } from '@/src/lib/review-session-gateway.ts'
import { ReplyEntry } from '@/src/primitives/reply-entry.tsx'
import { ReplyThread } from '@/src/primitives/reply-thread.tsx'

export function CommentReplies({ replies }: { replies: CommentReply[] }) {
  const now = useNow()
  if (replies.length === 0) {
    return null
  }
  return (
    <ReplyThread>
      {replies.map((reply) => {
        return (
          <ReplyEntry
            key={reply.id}
            author={reply.author}
            age={RelativeTime.format(reply.createdAt, now)}
            body={CommentMarkdown.summary(reply.body)}
          />
        )
      })}
    </ReplyThread>
  )
}
