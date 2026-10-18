import { VscChevronLeft } from 'react-icons/vsc'
import { IconButton } from '@/src/primitives/icon-button.tsx'

interface PanelHeaderProps {
  title: string
  onBack: () => void
}

export function PanelHeader({ title, onBack }: PanelHeaderProps) {
  return (
    <div className={'-mx-1 flex items-center gap-1'}>
      <IconButton aria-label={'Back'} onClick={onBack}>
        <VscChevronLeft />
      </IconButton>
      <span className={'font-medium'}>{title}</span>
    </div>
  )
}
