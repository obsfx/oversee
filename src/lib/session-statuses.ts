import { ValueGuards } from '@/src/lib/value-guards.ts'

const STATUSES = ['created', 'in-progress', 'closed'] as const

export type SessionStatus = (typeof STATUSES)[number]

const LABELS: Record<SessionStatus, string> = {
  created: 'Created',
  'in-progress': 'In progress',
  closed: 'Closed',
}

export abstract class SessionStatuses {
  static isStatus(value: unknown): value is SessionStatus {
    return ValueGuards.isOneOf(STATUSES, value)
  }

  static label(status: SessionStatus) {
    return LABELS[status]
  }
}
