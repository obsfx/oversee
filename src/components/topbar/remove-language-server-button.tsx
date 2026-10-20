import { Popover } from '@base-ui/react/popover'
import { useRemoveLanguageServer } from '@/src/hooks/use-remove-language-server.ts'
import type { LanguageServer } from '@/src/lib/language-server-gateway.ts'
import { Button } from '@/src/primitives/button.tsx'
import { ConfirmPrompt } from '@/src/primitives/confirm-prompt.tsx'
import { PopoverSurface } from '@/src/primitives/popover-surface.tsx'

interface RemoveLanguageServerButtonProps {
  server: LanguageServer
  onRemove: () => void
}

export function RemoveLanguageServerButton({ server, onRemove }: RemoveLanguageServerButtonProps) {
  const remove = useRemoveLanguageServer(server, onRemove)

  return (
    <Popover.Root open={remove.confirmOpen} onOpenChange={remove.setConfirmOpen}>
      <Popover.Trigger render={<Button variant={'ghost'} />}>{remove.label}</Popover.Trigger>
      <PopoverSurface align={'end'} caret className={'w-64'}>
        <ConfirmPrompt title={remove.title} description={remove.description}>
          <Popover.Close render={<Button variant={'ghost'} />}>Cancel</Popover.Close>
          <Button variant={'accent-subtle'} onClick={remove.confirm}>
            {remove.label}
          </Button>
        </ConfirmPrompt>
      </PopoverSurface>
    </Popover.Root>
  )
}
