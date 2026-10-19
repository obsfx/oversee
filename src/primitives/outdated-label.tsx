import { VscHistory } from 'react-icons/vsc'

export function OutdatedLabel() {
  return (
    <span className={'inline-flex shrink-0 items-center gap-0.5 text-fg-faint'}>
      <VscHistory className={'size-2.5'} />
      outdated
    </span>
  )
}
