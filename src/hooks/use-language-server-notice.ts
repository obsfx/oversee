import { useLanguageServerActions } from '@/src/hooks/use-language-server-actions.ts'
import { useLanguageServers } from '@/src/hooks/use-language-servers.ts'
import { LanguageServerLabels } from '@/src/lib/language-server-labels.ts'
import { LanguageServerNotices } from '@/src/lib/language-server-notices.ts'
import { LanguageServerStates } from '@/src/lib/language-server-states.ts'
import { useLanguageServerStore } from '@/src/store/language-server-store.ts'
import { useNavigationStore } from '@/src/store/navigation-store.ts'
import { useSettingsStore } from '@/src/store/settings-store.ts'

export const useLanguageServerNotice = () => {
  const { list, platform } = useLanguageServers()
  const { failures, install, cancel } = useLanguageServerActions()
  const readyId = useLanguageServerStore((languageServers) => {
    return languageServers.readyId
  })
  const path = useNavigationStore((navigation) => {
    return navigation.selectedPath
  })
  const dismissed = useSettingsStore((settings) => {
    return settings.dismissedLanguageServers
  })
  const updateSettings = useSettingsStore((settings) => {
    return settings.update
  })

  if (!list) {
    return null
  }
  const notice = LanguageServerNotices.of({ list, path, dismissed, readyId, failures })
  if (!notice) {
    return null
  }
  const { id } = notice.server
  return {
    kind: notice.kind,
    title: LanguageServerLabels.noticeTitle(notice),
    detail: LanguageServerLabels.noticeDetail(notice, platform),
    error: notice.error,
    progress: LanguageServerStates.ratio(notice.server.progress),
    install: () => {
      install(id)
    },
    cancel: () => {
      cancel(id)
    },
    dismiss: () => {
      updateSettings({ dismissedLanguageServers: [...dismissed, id] })
    },
  }
}
