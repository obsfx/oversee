import type { LanguageServer } from '@/src/lib/language-server-gateway.ts'
import { LanguageServerLabels } from '@/src/lib/language-server-labels.ts'
import {
  type LanguageServerAction,
  LanguageServerStates,
} from '@/src/lib/language-server-states.ts'
import { DisclosureButton } from '@/src/primitives/disclosure-button.tsx'
import { ErrorLog } from '@/src/primitives/error-log.tsx'
import { InlineError } from '@/src/primitives/inline-error.tsx'
import { ProgressBar } from '@/src/primitives/progress-bar.tsx'
import { RequirementList } from '@/src/primitives/requirement-list.tsx'
import { ServerRow } from '@/src/primitives/server-row.tsx'
import { LanguageServerActions } from '@/src/components/topbar/language-server-actions.tsx'

interface LanguageServerRowProps {
  server: LanguageServer
  platform: string
  expanded: boolean
  failure: string | null
  onToggle: () => void
  onRun: (action: LanguageServerAction, id: string) => void
}

export function LanguageServerRow({
  server,
  platform,
  expanded,
  failure,
  onToggle,
  onRun,
}: LanguageServerRowProps) {
  const status = LanguageServerLabels.status(server, platform)
  const requirements = LanguageServerLabels.requirements(server)
  const failed = server.status === 'failed'
  let statusText = <span className={'truncate'}>{status}</span>
  if (failed) {
    statusText = (
      <DisclosureButton expanded={expanded} onClick={onToggle}>
        {status}
      </DisclosureButton>
    )
  }
  let requirementList = null
  if (requirements.length > 0) {
    requirementList = <RequirementList items={requirements} />
  }

  return (
    <ServerRow
      name={server.id}
      languages={LanguageServerLabels.languages(server)}
      status={statusText}
      tone={LanguageServerStates.tone(server)}
      requirements={requirementList}
      actions={<LanguageServerActions server={server} onRun={onRun} />}
    >
      {server.status === 'installing' && (
        <ProgressBar
          label={`Installing ${server.id}`}
          ratio={LanguageServerStates.ratio(server.progress)}
          className={'rounded-full'}
        />
      )}
      {failed && expanded && <ErrorLog>{server.error}</ErrorLog>}
      {failure && <InlineError>{failure}</InlineError>}
    </ServerRow>
  )
}
