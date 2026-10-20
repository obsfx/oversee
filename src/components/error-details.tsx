import { Popover } from '@base-ui/react/popover'
import { ErrorLog } from '@/src/primitives/error-log.tsx'
import { PopoverSurface } from '@/src/primitives/popover-surface.tsx'
import { TextButton } from '@/src/primitives/text-button.tsx'

export function ErrorDetails({ error }: { error: string }) {
  return (
    <Popover.Root>
      <Popover.Trigger render={<TextButton />}>Details</Popover.Trigger>
      <PopoverSurface align={'end'} className={'w-96 p-2'}>
        <ErrorLog>{error}</ErrorLog>
      </PopoverSurface>
    </Popover.Root>
  )
}
