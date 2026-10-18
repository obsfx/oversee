import { VscChevronLeft } from 'react-icons/vsc'
import { IconButton } from '@/src/primitives/icon-button.tsx'
import { Tooltip } from '@/src/primitives/tooltip.tsx'

interface PanelHeaderProps {
  title: string
  onBack: () => void
}

export function PanelHeader({ title, onBack }: PanelHeaderProps) {
  return (
    <div className={'-mx-1 flex items-center gap-1'}>
      <Tooltip label={'Back'}>
        <IconButton aria-label={'Back'} onClick={onBack}>
          <VscChevronLeft />
        </IconButton>
      </Tooltip>
      <span className={'font-medium'}>{title}</span>
    </div>
  )
}
