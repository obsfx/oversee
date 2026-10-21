import { VscFileCode, VscLibrary } from 'react-icons/vsc'
import { StartTruncate } from '@/src/primitives/start-truncate.tsx'

interface LocationLabelProps {
  external: boolean
  name: string
  directory: string
  title: string
}

export function LocationLabel({ external, name, directory, title }: LocationLabelProps) {
  const Icon = external ? VscLibrary : VscFileCode

  return (
    <span className={'flex min-w-0 items-center gap-1.5'} title={title}>
      <Icon className={'shrink-0 text-fg-faint'} />
      <span className={'min-w-0 truncate font-medium'}>{name}</span>
      <StartTruncate className={'shrink-[999] text-mini text-fg-faint'}>{directory}</StartTruncate>
    </span>
  )
}
