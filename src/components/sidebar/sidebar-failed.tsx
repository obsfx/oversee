import { VscRefresh, VscWarning } from 'react-icons/vsc'
import { Button } from '@/src/primitives/button.tsx'
import { CenteredStatus } from '@/src/primitives/centered-status.tsx'

interface SidebarFailedProps {
  reason: string
  onRetry: () => void
}

export function SidebarFailed({ reason, onRetry }: SidebarFailedProps) {
  return (
    <CenteredStatus icon={<VscWarning className={'text-danger'} />}>
      <span title={reason}>Could not load files</span>
      <Button onClick={onRetry}>
        <VscRefresh />
        Retry
      </Button>
    </CenteredStatus>
  )
}
