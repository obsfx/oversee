import { useEffect } from 'react'
import { useServices } from '@/src/context/services/use-services.ts'
import { useComparison } from '@/src/hooks/use-comparison.ts'
import { type KeyedRequest, useKeyedPromise } from '@/src/hooks/use-keyed-promise.ts'
import { type DefinitionLookup, DefinitionQueries } from '@/src/lib/definition-gateway.ts'
import { DefinitionSurface } from '@/src/lib/definition-surface.ts'
import type { HoverToken } from '@/src/lib/definition-hover.ts'

export type DefinitionLookupState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; lookup: DefinitionLookup }
  | { status: 'failed'; error: Error }

export const useDefinitionLookup = (token: HoverToken | null, visible: boolean) => {
  const services = useServices()
  const { comparison } = useComparison()
  let request: KeyedRequest<DefinitionLookup> | null = null
  if (comparison && token) {
    const query = DefinitionQueries.of(comparison, token)
    request = {
      key: DefinitionQueries.key(query),
      load: () => {
        return services.definitions.find(query)
      },
    }
  }
  const result = useKeyedPromise(request)

  let state: DefinitionLookupState
  if (result.status === 'ready') {
    state = { status: 'ready', lookup: result.value }
  } else {
    state = result
  }
  const linked = visible && state.status === 'ready' && state.lookup.definitions.length > 0

  useEffect(() => {
    if (!token || !linked) {
      return
    }
    return DefinitionSurface.link(token.element)
  }, [token, linked])

  return state
}
