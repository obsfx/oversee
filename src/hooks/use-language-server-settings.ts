import { useState } from 'react'
import { useLanguageServerActions } from '@/src/hooks/use-language-server-actions.ts'
import { useLanguageServers } from '@/src/hooks/use-language-servers.ts'
import {
  type LanguageServerAction,
  LanguageServerStates,
} from '@/src/lib/language-server-states.ts'

export const useLanguageServerSettings = () => {
  const { state, servers, platform } = useLanguageServers()
  const { failures, install, uninstall, cancel } = useLanguageServerActions()
  const [query, setQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const visible = servers.filter((server) => {
    return LanguageServerStates.matches(server, query)
  })

  return {
    state,
    platform,
    query,
    setQuery,
    servers: visible,
    noMatch: state.status === 'ready' && visible.length === 0,
    failureOf: (id: string) => {
      return failures.get(id) ?? null
    },
    expandedId,
    toggleExpanded: (id: string) => {
      setExpandedId((current) => {
        return current === id ? null : id
      })
    },
    run: (action: LanguageServerAction, id: string) => {
      if (action === 'remove') {
        uninstall(id)
        return
      }
      if (action === 'cancel') {
        cancel(id)
        return
      }
      install(id)
    },
  }
}
