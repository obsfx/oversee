import type { Comparison } from '@/src/lib/comparison-rules.ts'
import type { ReviewNotification } from '@/src/lib/notification-gateway.ts'

const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE

const comparison: Comparison = {
  source: { kind: 'branch', name: 'feat/upgrade-deprecated-versions' },
  target: 'main',
}

export const reviewNotifications: ReviewNotification[] = [
  {
    id: 4,
    kind: 'session-status',
    sessionId: 's2',
    comparison,
    status: 'in-progress',
    createdAt: Date.now() - 6 * MINUTE,
    readAt: null,
  },
  {
    id: 3,
    kind: 'comment-reply',
    sessionId: 's2',
    comparison,
    commentId: 's2c1',
    filePath: 'scripts/expire_password.ts',
    line: 6,
    createdAt: Date.now() - 20 * MINUTE,
    readAt: null,
  },
  {
    id: 2,
    kind: 'session-status',
    sessionId: 's1',
    comparison,
    status: 'closed',
    createdAt: Date.now() - 5 * HOUR,
    readAt: Date.now() - 4 * HOUR,
  },
  {
    id: 1,
    kind: 'session-status',
    sessionId: 's1',
    comparison,
    status: 'in-progress',
    createdAt: Date.now() - 26 * HOUR,
    readAt: Date.now() - 25 * HOUR,
  },
]
