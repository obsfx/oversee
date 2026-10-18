import { VscChevronDown, VscChevronUp } from 'react-icons/vsc'
import { FileProgress } from '@/src/primitives/file-progress.tsx'
import { IconButton } from '@/src/primitives/icon-button.tsx'
import { Tooltip } from '@/src/primitives/tooltip.tsx'

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
      <Tooltip label={'Previous file'}>
        <IconButton
          aria-label={'Previous file'}
          disabled={!canPrevious}
          onClick={onPrevious}
          className={'h-5 min-w-5'}
        >
          <VscChevronUp />
        </IconButton>
      </Tooltip>
      <Tooltip label={'Next file'}>
        <IconButton
          aria-label={'Next file'}
          disabled={!canNext}
          onClick={onNext}
          className={'h-5 min-w-5'}
        >
          <VscChevronDown />
        </IconButton>
      </Tooltip>
      <FileProgress position={position} total={total} percent={percent} />
    </div>
  )
}
