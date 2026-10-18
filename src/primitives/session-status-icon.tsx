import type { IconType } from 'react-icons'
import { TbCircleCheckFilled, TbCircleDashed, TbProgress } from 'react-icons/tb'
import { c } from '@/src/c.ts'
import { type SessionStatus, SessionStatuses } from '@/src/lib/session-statuses.ts'
import { Tooltip } from '@/src/primitives/tooltip.tsx'

interface StatusLook {
  icon: IconType
  tone: string
}

const LOOKS: Record<SessionStatus, StatusLook> = {
  created: { icon: TbCircleDashed, tone: 'text-fg-muted' },
  'in-progress': { icon: TbProgress, tone: 'text-status-modified' },
  closed: { icon: TbCircleCheckFilled, tone: 'text-reviewed' },
}

export function SessionStatusIcon({ status }: { status: SessionStatus }) {
  const { icon: Icon, tone } = LOOKS[status]
  const label = SessionStatuses.label(status)

  return (
    <Tooltip label={label}>
      <span role={'img'} aria-label={label} className={c('inline-flex shrink-0', tone)}>
        <Icon className={'size-3.5'} />
      </span>
    </Tooltip>
  )
}
