import { VscLoading } from 'react-icons/vsc'
import { c } from '../c.ts'

export function Spinner({ className }: { className?: string }) {
  return <VscLoading aria-hidden className={c('shrink-0 animate-spin text-fg-faint', className)} />
}
