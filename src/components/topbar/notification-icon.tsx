import { VscReply } from 'react-icons/vsc'
import type { ReviewNotification } from '@/src/lib/notification-gateway.ts'
import { SessionStatusIcon } from '@/src/primitives/session-status-icon.tsx'

export function NotificationIcon({ notification }: { notification: ReviewNotification }) {
  if (notification.kind === 'session-status') {
    return <SessionStatusIcon status={notification.status} />
  }
  return <VscReply aria-label={'Reply'} className={'size-3.5 shrink-0 text-accent'} />
}
