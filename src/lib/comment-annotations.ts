import type { DiffLineAnnotation } from '@pierre/diffs/react'
import type { ReviewComment } from '@/src/lib/comment-gateway.ts'
import { type LineAnchor, LineRanges, type LineRange } from '@/src/lib/line-range.ts'

export type DiffAnnotationMeta =
  | { kind: 'comments'; comments: ReviewComment[] }
  | { kind: 'composer'; range: LineRange; comment: ReviewComment | null }
  | { kind: 'selection'; range: LineRange }

export type DiffAnnotation = DiffLineAnnotation<DiffAnnotationMeta>

export interface AnnotationSources {
  comments: ReviewComment[]
  composer: { range: LineRange; commentId: string | null } | null
  selection: LineRange | null
}

export abstract class CommentAnnotations {
  static build({ comments, composer, selection }: AnnotationSources): DiffAnnotation[] {
    const edited =
      comments.find((comment) => {
        return comment.id === composer?.commentId
      }) ?? null
    const visible = comments.filter((comment) => {
      return comment !== edited
    })
    const annotations = CommentAnnotations.threads(visible)
    if (composer) {
      annotations.push({
        ...LineRanges.anchor(composer.range),
        metadata: { kind: 'composer', range: composer.range, comment: edited },
      })
    }
    if (selection) {
      annotations.push({
        ...LineRanges.anchor(selection),
        metadata: { kind: 'selection', range: selection },
      })
    }
    return annotations
  }

  private static threads(comments: ReviewComment[]): DiffAnnotation[] {
    const threads = new Map<string, { anchor: LineAnchor; comments: ReviewComment[] }>()
    for (const comment of comments) {
      const anchor = LineRanges.anchor(comment.range)
      const key = LineRanges.anchorKey(anchor)
      const thread = threads.get(key)
      if (thread) {
        thread.comments.push(comment)
      } else {
        threads.set(key, { anchor, comments: [comment] })
      }
    }
    return [...threads.values()].map(({ anchor, comments: thread }) => {
      return { ...anchor, metadata: { kind: 'comments', comments: thread } }
    })
  }
}
