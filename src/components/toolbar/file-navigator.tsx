import { VscChevronDown, VscChevronUp } from 'react-icons/vsc'
import { FileProgress } from '@/src/primitives/file-progress.tsx'
import { IconButton } from '@/src/primitives/icon-button.tsx'

interface FileNavigatorProps {
  position: number
  total: number
  percent: number
  canPrevious: boolean
  canNext: boolean
  onPrevious: () => void
  onNext: () => void
}

export function FileNavigator({
  position,
  total,
  percent,
  canPrevious,
  canNext,
  onPrevious,
  onNext,
}: FileNavigatorProps) {
  return (
    <div className={'flex items-center gap-0.5'}>
      <IconButton
        title={'Previous file'}
        aria-label={'Previous file'}
        disabled={!canPrevious}
        onClick={onPrevious}
        className={'h-5 min-w-5'}
      >
        <VscChevronUp />
      </IconButton>
      <IconButton
        title={'Next file'}
        aria-label={'Next file'}
        disabled={!canNext}
        onClick={onNext}
        className={'h-5 min-w-5'}
      >
        <VscChevronDown />
      </IconButton>
      <FileProgress position={position} total={total} percent={percent} />
    </div>
  )
}
