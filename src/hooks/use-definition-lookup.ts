import { useEffect, useState } from 'react'
import { useServices } from '@/src/context/services/use-services.ts'
import { useComparison } from '@/src/hooks/use-comparison.ts'
import { ComparisonRules } from '@/src/lib/comparison-rules.ts'
import { type DefinitionLookup, DefinitionQueries } from '@/src/lib/definition-gateway.ts'
import { DefinitionSurface } from '@/src/lib/definition-surface.ts'
import type { HoverToken } from '@/src/lib/definition-hover.ts'

export type DefinitionLookupState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; lookup: DefinitionLookup }
  | { status: 'failed'; error: Error }

interface LookupResult {
  token: HoverToken
  state: DefinitionLookupState
}

export const useDefinitionLookup = (token: HoverToken | null, visible: boolean) => {
  const services = useServices()
  const { comparison } = useComparison()
  const [result, setResult] = useState<LookupResult | null>(null)
  let source: string | null = null
  let target: string | null = null
  if (comparison) {
    const wire = ComparisonRules.query(comparison)
    source = wire.source
    target = wire.target
  }

  useEffect(() => {
    if (!token || source === null || target === null) {
      return
    }
    let current = true
    const query = DefinitionQueries.of(ComparisonRules.fromQuery(source, target), token)
    services.definitions.find(query).then(
      (lookup) => {
        if (current) {
          setResult({ token, state: { status: 'ready', lookup } })
        }
      },
      (error: unknown) => {
        if (current) {
          const failure = error instanceof Error ? error : new Error(String(error))
          setResult({ token, state: { status: 'failed', error: failure } })
        }
      },
    )
    return () => {
      current = false
    }
  }, [token, source, target, services])

  let state: DefinitionLookupState = { status: 'idle' }
  if (token) {
    state = result?.token === token ? result.state : { status: 'loading' }
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
