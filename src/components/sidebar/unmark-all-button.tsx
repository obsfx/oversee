import { Popover } from '@base-ui/react/popover'
import { VscClearAll } from 'react-icons/vsc'
import { useUnmarkAllReviewed } from '@/src/hooks/use-unmark-all-reviewed.ts'
import { Button } from '@/src/primitives/button.tsx'
import { ConfirmPrompt } from '@/src/primitives/confirm-prompt.tsx'
import { PopoverSurface } from '@/src/primitives/popover-surface.tsx'
import { SidebarIconButton } from '@/src/primitives/sidebar-icon-button.tsx'
import { Tooltip } from '@/src/primitives/tooltip.tsx'

export function UnmarkAllButton() {
  const { label, disabled, title, confirmOpen, setConfirmOpen, confirm } = useUnmarkAllReviewed()

  return (
    <Popover.Root open={confirmOpen} onOpenChange={setConfirmOpen}>
      <Tooltip label={label}>
        <Popover.Trigger render={<SidebarIconButton />} aria-label={label} disabled={disabled}>
          <VscClearAll />
        </Popover.Trigger>
      </Tooltip>
      <PopoverSurface align={'end'} caret className={'w-max'}>
        <ConfirmPrompt title={title}>
          <Popover.Close render={<Button variant={'ghost'} />}>Cancel</Popover.Close>
          <Button variant={'accent-subtle'} onClick={confirm}>
            Unmark all
          </Button>
        </ConfirmPrompt>
      </PopoverSurface>
    </Popover.Root>
  )
}
