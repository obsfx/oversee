import type { LanguageServer } from '@/src/lib/language-server-gateway.ts'
import { LanguageServerLabels } from '@/src/lib/language-server-labels.ts'
import {
  type LanguageServerAction,
  LanguageServerStates,
} from '@/src/lib/language-server-states.ts'
import { Button, type ButtonVariant } from '@/src/primitives/button.tsx'
import { RemoveLanguageServerButton } from '@/src/components/topbar/remove-language-server-button.tsx'

const VARIANTS: Record<Exclude<LanguageServerAction, 'remove'>, ButtonVariant> = {
  install: 'surface',
  update: 'accent-subtle',
  retry: 'accent-subtle',
  cancel: 'ghost',
}

interface LanguageServerActionsProps {
  server: LanguageServer
  onRun: (action: LanguageServerAction, id: string) => void
}

export function LanguageServerActions({ server, onRun }: LanguageServerActionsProps) {
  return LanguageServerStates.actions(server).map((action) => {
    if (action === 'remove') {
      return (
        <RemoveLanguageServerButton
          key={action}
          server={server}
          onRemove={() => {
            onRun(action, server.id)
          }}
        />
      )
    }
    return (
      <Button
        key={action}
        variant={VARIANTS[action]}
        onClick={() => {
          onRun(action, server.id)
        }}
      >
        {LanguageServerLabels.action(action)}
      </Button>
    )
  })
}
