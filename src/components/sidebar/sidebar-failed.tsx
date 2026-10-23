import { VscRefresh, VscWarning } from 'react-icons/vsc'
import { Button } from '@/src/primitives/button.tsx'
import { CenteredStatus } from '@/src/primitives/centered-status.tsx'

interface SidebarFailedProps {
  label: string
  reason: string
  onRetry: () => void
}

export function SidebarFailed({ label, reason, onRetry }: SidebarFailedProps) {
  return (
    <CenteredStatus icon={<VscWarning className={'text-danger'} />}>
      <span title={reason}>{label}</span>
      <Button onClick={onRetry}>
        <VscRefresh />
        Retry
      </Button>
    </CenteredStatus>
  )
}
