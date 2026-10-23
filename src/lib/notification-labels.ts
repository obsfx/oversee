import { ComparisonLabels } from '@/src/lib/comparison-labels.ts'
import type { ReviewNotification } from '@/src/lib/notification-gateway.ts'
import { LocationLabels } from '@/src/lib/location-labels.ts'
import { RelativeTime } from '@/src/lib/relative-time.ts'
import { SessionStatuses } from '@/src/lib/session-statuses.ts'

export abstract class NotificationLabels {
  static title(notification: ReviewNotification) {
    if (notification.kind === 'comment-reply') {
      return `Agent replied on ${LocationLabels.fileLine(notification.filePath, notification.line)}`
    }
    if (notification.status === 'closed') {
      return 'Review closed'
    }
    return `Review moved to ${SessionStatuses.label(notification.status).toLowerCase()}`
  }

  static comparison(notification: ReviewNotification) {
    return ComparisonLabels.of(notification.comparison)
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
}
