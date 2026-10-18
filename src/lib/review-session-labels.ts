import dayjs from 'dayjs'
import { CountLabels } from '@/src/lib/count-labels.ts'
import type { ReviewSession } from '@/src/lib/review-session-gateway.ts'

export abstract class ReviewSessionLabels {
  static title(session: ReviewSession) {
    return dayjs(session.finishedAt).format('MMM D, HH:mm')
  }

  static count(session: ReviewSession) {
    return CountLabels.of(session.comments.length, 'comment')
  }
}
