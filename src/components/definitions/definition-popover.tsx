import type { DefinitionLookupState } from '@/src/hooks/use-definition-lookup.ts'
import type { Definition } from '@/src/lib/definition-gateway.ts'
import { type HoverToken, HoverTokens } from '@/src/lib/definition-hover.ts'
import { AnchoredPopoverSurface } from '@/src/primitives/anchored-popover-surface.tsx'
import { DefinitionPopoverContent } from '@/src/components/definitions/definition-popover-content.tsx'

interface DefinitionPopoverProps {
  token: HoverToken | null
  visible: boolean
  state: DefinitionLookupState
  popover: {
    onPointerEnter: () => void
    onPointerLeave: () => void
    close: () => void
  }
  onOpen: (definition: Definition) => void
}

export function DefinitionPopover({
  token,
  visible,
  state,
  popover,
  onOpen,
}: DefinitionPopoverProps) {
  return (
    <AnchoredPopoverSurface
      open={visible}
      anchor={token?.element ?? null}
      className={'w-[28rem]'}
      onPointerEnter={popover.onPointerEnter}
      onPointerLeave={popover.onPointerLeave}
      onClose={popover.close}
    >
      {token && (
        <DefinitionPopoverContent key={HoverTokens.key(token)} state={state} onOpen={onOpen} />
      )}
    </AnchoredPopoverSurface>
  )
}
