import { VscRefresh, VscWarning } from 'react-icons/vsc'
import { ChipButton } from '../../primitives/chip-button.tsx'
import { TopbarGroup } from '../../primitives/topbar-group.tsx'

interface ComparisonPickerFailedProps {
  reason: string
  onRetry: () => void
}

export function ComparisonPickerFailed({ reason, onRetry }: ComparisonPickerFailedProps) {
  return (
    <TopbarGroup>
      <span className={'flex items-center gap-1.5 px-1.5'} title={reason}>
        <VscWarning className={'shrink-0 text-danger'} />
        <span className={'truncate'}>Could not load branches</span>
      </span>
      <ChipButton onClick={onRetry}>
        <VscRefresh className={'shrink-0 text-fg-muted'} />
        <span>Retry</span>
      </ChipButton>
    </TopbarGroup>
  )
}
