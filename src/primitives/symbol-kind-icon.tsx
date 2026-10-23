import type { IconType } from 'react-icons'
import { LuAnchor, LuComponent, LuZap } from 'react-icons/lu'
import { VscSymbolEvent, VscSymbolMethod } from 'react-icons/vsc'
import { c } from '@/src/c.ts'
import type { CallFlowKind } from '@/src/lib/call-flow.ts'
import { CallFlowLabels } from '@/src/lib/call-flow-labels.ts'

interface KindLook {
  icon: IconType
  tone: string
}

const LOOKS: Record<CallFlowKind, KindLook> = {
  component: { icon: LuComponent, tone: 'text-symbol-component' },
  hook: { icon: LuAnchor, tone: 'text-symbol-hook' },
  function: { icon: VscSymbolMethod, tone: 'text-symbol-function' },
  method: { icon: VscSymbolMethod, tone: 'text-symbol-function' },
  callback: { icon: LuZap, tone: 'text-symbol-callback' },
  handler: { icon: VscSymbolEvent, tone: 'text-symbol-handler' },
}

export function SymbolKindIcon({ kind }: { kind: CallFlowKind }) {
  const { icon: Icon, tone } = LOOKS[kind]
  const label = CallFlowLabels.kind(kind)

  return (
    <span
      role={'img'}
      aria-label={label}
      title={label}
      className={c('inline-flex size-3.5 shrink-0 items-center', tone)}
    >
      <Icon className={'size-3.5'} />
    </span>
  )
}
