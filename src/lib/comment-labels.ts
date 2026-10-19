import { CountLabels } from '@/src/lib/count-labels.ts'
import { RelativeTime } from '@/src/lib/relative-time.ts'

export abstract class CommentLabels {
  static summary(total: number, outdated: number) {
    const comments = CountLabels.of(total, 'comment')
    if (outdated === 0) {
      return comments
    }
    return `${comments}, ${outdated} outdated`
  }

  static outdatedCount(outdated: number) {
    return CountLabels.of(outdated, 'outdated comment')
  }

  static outdatedAge(outdatedAt: number, now: number) {
    return `outdated ${RelativeTime.format(outdatedAt, now)}`
  }

  static finishSummary(total: number, outdated: number) {
    const moved = `${CountLabels.of(total, 'comment')} will move to Sessions.`
    if (outdated === 0) {
      return moved
    }
    return `${moved} Outdated ones (${outdated}) keep their saved code.`
  }
}
