import { type KeyboardEvent, useState } from 'react'
import { CommentReaderRules } from '@/src/lib/comment-reader-rules.ts'
import { EditableTargets } from '@/src/lib/editable-targets.ts'
import type { SessionComment } from '@/src/lib/review-session-gateway.ts'

interface ReaderState {
  commentId: string | null
  open: boolean
}

export const useCommentReader = (comments: SessionComment[]) => {
  const [state, setState] = useState<ReaderState>({ commentId: null, open: false })
  const index = comments.findIndex((comment) => {
    return comment.id === state.commentId
  })
  const comment = index < 0 ? null : comments[index]
  const step = (delta: number) => {
    const neighbor = CommentReaderRules.neighborOf(comments, index, delta)
    if (neighbor) {
      setState({ commentId: neighbor.id, open: true })
    }
  }

  return {
    open: state.open && comment !== null,
    comment,
    position: index + 1,
    count: comments.length,
    hasPrevious: index > 0,
    hasNext: index >= 0 && index < comments.length - 1,
    show: (commentId: string) => {
      setState({ commentId, open: true })
    },
    close: () => {
      setState({ commentId: state.commentId, open: false })
    },
    previous: () => {
      step(-1)
    },
    next: () => {
      step(1)
    },
    handleKey: (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || EditableTargets.is(event.target)) {
        return
      }
      const delta = CommentReaderRules.stepOf(event.key)
      if (delta !== null) {
        event.preventDefault()
        step(delta)
      }
    },
  }
}

export type CommentReaderModel = ReturnType<typeof useCommentReader>
