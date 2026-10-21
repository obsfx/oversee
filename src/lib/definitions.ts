import {
  type DefinitionGateway,
  type DefinitionLookup,
  type DefinitionQuery,
  DefinitionQueries,
} from '@/src/lib/definition-gateway.ts'

export class Definitions {
  private readonly cache = new Map<string, Promise<DefinitionLookup>>()
  private readonly gateway: DefinitionGateway

  constructor(gateway: DefinitionGateway) {
    this.gateway = gateway
  }

  find(query: DefinitionQuery) {
    const key = DefinitionQueries.key(query)
    const cached = this.cache.get(key)
    if (cached) {
      return cached
    }
    const pending = this.gateway.find(query).then(
      (lookup) => {
        if (lookup.status !== 'ready') {
          this.cache.delete(key)
        }
        return lookup
      },
      (error: unknown) => {
        this.cache.delete(key)
        throw error
      },
    )
    this.cache.set(key, pending)
    return pending
  }

  clear() {
    this.cache.clear()
  }
}
