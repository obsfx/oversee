import { VscChevronLeft, VscChevronRight } from 'react-icons/vsc'
import { IconButton } from '@/src/primitives/icon-button.tsx'

interface ScrollButtonsProps {
  previousLabel: string
  nextLabel: string
  canPrevious: boolean
  canNext: boolean
  onPrevious: () => void
  onNext: () => void
}

export function ScrollButtons({
  previousLabel,
  nextLabel,
  canPrevious,
  canNext,
  onPrevious,
  onNext,
}: ScrollButtonsProps) {
  return (
    <>
      <IconButton aria-label={previousLabel} disabled={!canPrevious} onClick={onPrevious}>
        <VscChevronLeft />
      </IconButton>
      <IconButton aria-label={nextLabel} disabled={!canNext} onClick={onNext}>
        <VscChevronRight />
      </IconButton>
    </>
  )
}
