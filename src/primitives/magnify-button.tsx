import { VscScreenFull } from 'react-icons/vsc'
import { IconButton } from '@/src/primitives/icon-button.tsx'
import { Tooltip } from '@/src/primitives/tooltip.tsx'

interface MagnifyButtonProps {
  label: string
  onClick: () => void
}

export function MagnifyButton({ label, onClick }: MagnifyButtonProps) {
  return (
    <Tooltip label={label}>
      <IconButton
        aria-label={label}
        onClick={onClick}
        className={'-my-0.5 ml-auto h-5 min-w-5 shrink-0 text-xs'}
      >
        <VscScreenFull />
      </IconButton>
    </Tooltip>
  )
}
