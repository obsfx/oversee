import type { ReactNode } from 'react'
import { VscArrowLeft } from 'react-icons/vsc'
import { IconButton } from '@/src/primitives/icon-button.tsx'

interface SessionDetailHeaderProps {
  onBack: () => void
  children: ReactNode
}

export function SessionDetailHeader({ onBack, children }: SessionDetailHeaderProps) {
  return (
    <div className={'flex items-center gap-1.5 border-b border-line px-1.5 py-1'}>
      <IconButton aria-label={'Back to sessions'} onClick={onBack}>
        <VscArrowLeft />
      </IconButton>
      {children}
    </div>
  )
}
