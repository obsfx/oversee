import type { IconType } from 'react-icons'
import { LuPlug } from 'react-icons/lu'
import { VscBroadcast, VscSymbolInterface } from 'react-icons/vsc'

type ViaKind = 'signal' | 'connect' | 'implementation'

const ICONS: Record<ViaKind, IconType> = {
  signal: VscBroadcast,
  connect: LuPlug,
  implementation: VscSymbolInterface,
}

interface ViaLabelProps {
  via: ViaKind
  text: string
  title: string
}

export function ViaLabel({ via, text, title }: ViaLabelProps) {
  const Icon = ICONS[via]

  return (
    <span
      title={title}
      className={
        'flex max-w-[40%] min-w-0 shrink items-center gap-0.5 rounded-sm bg-sidebar-hover px-1 text-mini text-sidebar-muted'
      }
    >
      <Icon className={'size-3 shrink-0'} />
      <span className={'truncate'}>{text}</span>
    </span>
  )
}
