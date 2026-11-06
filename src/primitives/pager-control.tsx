import { VscChevronLeft, VscChevronRight } from 'react-icons/vsc'
import { IconButton } from '@/src/primitives/icon-button.tsx'

interface PagerControlProps {
  position: number
  count: number
  previousLabel: string
  nextLabel: string
  previousDisabled?: boolean
  nextDisabled?: boolean
  onPrevious: () => void
  onNext: () => void
}

export function PagerControl({
  position,
  count,
  previousLabel,
  nextLabel,
  previousDisabled = false,
  nextDisabled = false,
  onPrevious,
  onNext,
}: PagerControlProps) {
  return (
    <span className={'flex shrink-0 items-center gap-0.5 text-mini text-fg-muted'}>
      <IconButton aria-label={previousLabel} disabled={previousDisabled} onClick={onPrevious}>
        <VscChevronLeft />
      </IconButton>
      <span className={'whitespace-nowrap tabular-nums'}>
        {position} / {count}
      </span>
      <IconButton aria-label={nextLabel} disabled={nextDisabled} onClick={onNext}>
        <VscChevronRight />
      </IconButton>
    </span>
  )
}
