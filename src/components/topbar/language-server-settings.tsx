import { VscSearch } from 'react-icons/vsc'
import { useLanguageServerSettings } from '@/src/hooks/use-language-server-settings.ts'
import type { SettingsViewProps } from '@/src/hooks/use-settings-menu.ts'
import { BareInput } from '@/src/primitives/bare-input.tsx'
import { Footnote } from '@/src/primitives/footnote.tsx'
import { InputFrame } from '@/src/primitives/input-frame.tsx'
import { MutedHint } from '@/src/primitives/muted-hint.tsx'
import { PanelHeader } from '@/src/primitives/panel-header.tsx'
import { SettingsList } from '@/src/primitives/settings-list.tsx'
import { LanguageServerRow } from '@/src/components/topbar/language-server-row.tsx'

export function LanguageServerSettings({ navigate }: SettingsViewProps) {
  const settings = useLanguageServerSettings()

  return (
    <>
      <PanelHeader
        title={'Language servers'}
        onBack={() => {
          navigate('overview')
        }}
      />
      <InputFrame invalid={false}>
        <VscSearch className={'shrink-0 text-fg-faint'} />
        <BareInput
          value={settings.query}
          placeholder={'Filter by name or language'}
          aria-label={'Filter language servers'}
          onChange={(event) => {
            settings.setQuery(event.target.value)
          }}
        />
      </InputFrame>
      <SettingsList>
        {settings.state.status === 'loading' && <MutedHint>Loading language servers</MutedHint>}
        {settings.state.status === 'failed' && (
          <MutedHint>Could not load language servers</MutedHint>
        )}
        {settings.noMatch && <MutedHint>No language server matches</MutedHint>}
        {settings.servers.map((server) => {
          return (
            <LanguageServerRow
              key={server.id}
              server={server}
              platform={settings.platform}
              expanded={settings.expandedId === server.id}
              failure={settings.failureOf(server.id)}
              onToggle={() => {
                settings.toggleExpanded(server.id)
              }}
              onRun={settings.run}
            />
          )
        })}
      </SettingsList>
      <Footnote>Installed in ~/.oversee/lsp and shared by every workspace</Footnote>
    </>
  )
}
