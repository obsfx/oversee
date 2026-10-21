import { useState } from 'react'
import type { DefinitionLookupState } from '@/src/hooks/use-definition-lookup.ts'
import { useLanguageServerActions } from '@/src/hooks/use-language-server-actions.ts'
import type { Definition } from '@/src/lib/definition-gateway.ts'
import { DefinitionLabels } from '@/src/lib/definition-labels.ts'
import { PathParts } from '@/src/lib/path-parts.ts'

export const useDefinitionPopover = (state: DefinitionLookupState) => {
  const { install, failures } = useLanguageServerActions()
  const [index, setIndex] = useState(0)
  let definitions: Definition[] = []
  let status = DefinitionLabels.loading()
  let server: string | null = null
  if (state.status === 'ready') {
    definitions = state.lookup.definitions
    status = DefinitionLabels.status(state.lookup)
    if (state.lookup.status === 'not-installed' && state.lookup.server) {
      server = state.lookup.server
    }
  }
  if (state.status === 'failed') {
    status = DefinitionLabels.requestFailed(state.error)
  }
  const count = definitions.length
  const position = Math.min(index, Math.max(0, count - 1))
  const definition = definitions.at(position) ?? null
  let location = null
  if (definition) {
    location = {
      name: DefinitionLabels.location(definition),
      directory: PathParts.directory(definition.path),
      title: definition.path,
    }
  }
  let installFailure = null
  if (server) {
    installFailure = failures.get(server) ?? null
  }

  return {
    loading: state.status === 'loading' || state.status === 'idle',
    status,
    canInstall: server !== null,
    install: () => {
      if (server) {
        install(server)
      }
    },
    installFailure,
    definition,
    location,
    position: position + 1,
    count,
    previous: () => {
      setIndex((position + count - 1) % count)
    },
    next: () => {
      setIndex((position + 1) % count)
    },
  }
}
