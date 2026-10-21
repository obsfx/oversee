import type { DefinitionLookupState } from '@/src/hooks/use-definition-lookup.ts'
import { useDefinitionPopover } from '@/src/hooks/use-definition-popover.ts'
import type { Definition } from '@/src/lib/definition-gateway.ts'
import { DefinitionSnippets } from '@/src/lib/definition-snippets.ts'
import { LocationLabel } from '@/src/primitives/location-label.tsx'
import { PagerControl } from '@/src/primitives/pager-control.tsx'
import { InlineError } from '@/src/primitives/inline-error.tsx'
import { PopoverStatus } from '@/src/primitives/popover-status.tsx'
import { TextButton } from '@/src/primitives/text-button.tsx'
import { SessionSnippet } from '@/src/components/topbar/session-snippet.tsx'

interface DefinitionPopoverContentProps {
  state: DefinitionLookupState
  onOpen: (definition: Definition) => void
}

export function DefinitionPopoverContent({ state, onOpen }: DefinitionPopoverContentProps) {
  const view = useDefinitionPopover(state)
  const { definition, location } = view

  if (!definition || !location) {
    return (
      <PopoverStatus loading={view.loading} title={view.status.title} detail={view.status.detail}>
        {view.canInstall && (
          <TextButton className={'self-start'} onClick={view.install}>
            Install
          </TextButton>
        )}
        {view.installFailure && <InlineError>{view.installFailure}</InlineError>}
      </PopoverStatus>
    )
  }
  return (
    <div className={'flex flex-col gap-1 p-1.5'}>
      <button
        type={'button'}
        aria-label={`Open ${location.name}`}
        onClick={() => {
          onOpen(definition)
        }}
        className={'cursor-pointer text-left outline-none'}
      >
        <SessionSnippet lines={DefinitionSnippets.head(definition)} filePath={definition.path} />
      </button>
      <div className={'flex min-w-0 items-center gap-1 px-0.5'}>
        <LocationLabel
          external={definition.external}
          name={location.name}
          directory={location.directory}
          title={location.title}
        />
        {view.count > 1 && (
          <span className={'ml-auto'}>
            <PagerControl
              position={view.position}
              count={view.count}
              previousLabel={'Previous definition'}
              nextLabel={'Next definition'}
              onPrevious={view.previous}
              onNext={view.next}
            />
          </span>
        )}
      </div>
    </div>
  )
}
