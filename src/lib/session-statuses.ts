import * as v from 'valibot'

const STATUSES = ['created', 'in-progress', 'closed'] as const

export type SessionStatus = (typeof STATUSES)[number]

const LABELS: Record<SessionStatus, string> = {
  created: 'Created',
  'in-progress': 'In progress',
  closed: 'Closed',
}

export abstract class SessionStatuses {
  static readonly schema = v.picklist(STATUSES)

  static label(status: SessionStatus) {
    return LABELS[status]
  }
}
