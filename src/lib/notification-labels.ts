import { ComparisonRules } from '@/src/lib/comparison-rules.ts'
import { CountLabels } from '@/src/lib/count-labels.ts'
import type { ReviewNotification } from '@/src/lib/notification-gateway.ts'
import { RelativeTime } from '@/src/lib/relative-time.ts'
import { SessionStatuses } from '@/src/lib/session-statuses.ts'

export abstract class NotificationLabels {
  static title(notification: ReviewNotification) {
    if (notification.kind === 'comment-reply') {
      return `Agent replied on ${NotificationLabels.fileName(notification.filePath)}:${notification.line}`
    }
    if (notification.status === 'closed') {
      return 'Review closed'
    }
    return `Review moved to ${SessionStatuses.label(notification.status).toLowerCase()}`
  }

  static comparison(notification: ReviewNotification) {
    const { source, target } = notification.comparison
    return `${ComparisonRules.sourceLabel(source)} into ${target}`
  }

  static age(notification: ReviewNotification, now: number) {
    return RelativeTime.format(notification.createdAt, now)
  }

  static unread(count: number) {
    if (count === 0) {
      return 'All caught up'
    }
    return `${count} unread`
  }

  static count(count: number) {
    return CountLabels.of(count, 'notification')
  }

  private static fileName(path: string) {
    return path.split('/').pop() ?? path
  }
}
