import type { IconType } from 'react-icons'
import { VscDiffAdded, VscDiffModified, VscDiffRemoved } from 'react-icons/vsc'
import { c } from '@/src/c.ts'
import type { CallFlowChange } from '@/src/lib/call-flow.ts'
import { CallFlowLabels } from '@/src/lib/call-flow-labels.ts'

interface ChangeLook {
  icon: IconType
  tone: string
}

const LOOKS: Record<CallFlowChange, ChangeLook> = {
  added: { icon: VscDiffAdded, tone: 'text-status-added' },
  modified: { icon: VscDiffModified, tone: 'text-status-modified' },
  removed: { icon: VscDiffRemoved, tone: 'text-status-deleted' },
}

export function ChangeKindIcon({ change }: { change: CallFlowChange }) {
  const { icon: Icon, tone } = LOOKS[change]
  const label = CallFlowLabels.change(change)

  return (
    <span
      role={'img'}
      aria-label={label}
      title={label}
      className={c('inline-flex shrink-0 items-center', tone)}
    >
      <Icon className={'size-3'} />
    </span>
  )
}
