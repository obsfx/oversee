import { VscError } from 'react-icons/vsc'
import { Button } from '@/src/primitives/button.tsx'
import { CenteredStatus } from '@/src/primitives/centered-status.tsx'

interface LoadFailureProps {
  message: string
  onRetry: () => void
}

export function LoadFailure({ message, onRetry }: LoadFailureProps) {
  return (
    <CenteredStatus icon={<VscError />}>
      <span>{message}</span>
      <Button onClick={onRetry}>Retry</Button>
    </CenteredStatus>
  )
}
