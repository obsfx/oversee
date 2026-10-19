import * as v from 'valibot'
import type { ReviewComment } from '@/src/lib/comment-gateway.ts'
import { LineRanges } from '@/src/lib/line-range.ts'
import { ValueSchemas } from '@/src/lib/value-schemas.ts'

export abstract class CommentShapes {
  static readonly wire = v.object({
    id: v.string(),
    filePath: v.string(),
    range: LineRanges.schema,
    body: v.string(),
    lines: v.array(v.object({ number: ValueSchemas.positiveInteger, text: v.string() })),
    createdAt: v.number(),
    updatedAt: v.number(),
    outdatedAt: v.number(),
  })

  static readonly comment = v.pipe(CommentShapes.wire, v.transform(CommentShapes.toComment))

  static toComment(wire: v.InferOutput<typeof CommentShapes.wire>): ReviewComment {
    return { ...wire, outdatedAt: wire.outdatedAt > 0 ? wire.outdatedAt : null }
  }
}
