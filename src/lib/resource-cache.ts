import { AsyncResource } from '@/src/lib/async-resource.ts'

interface CacheEntry<K, T> {
  key: K
  resource: AsyncResource<T>
}

export class ResourceCache<K, T> {
  private readonly entries = new Map<string, CacheEntry<K, T>>()
  private readonly keyOf: (key: K) => string
  private readonly fetcher: (key: K) => Promise<T>

  constructor(keyOf: (key: K) => string, fetcher: (key: K) => Promise<T>) {
    this.keyOf = keyOf
    this.fetcher = fetcher
  }

  get(key: K) {
    const id = this.keyOf(key)
    const existing = this.entries.get(id)
    if (existing) {
      return existing.resource
    }
    const resource = new AsyncResource(() => {
      return this.fetcher(key)
    })
    this.entries.set(id, { key, resource })
    return resource
  }

  refresh(key: K) {
    return this.entries.get(this.keyOf(key))?.resource.refresh()
  }

  invalidate(key: K) {
    this.entries.get(this.keyOf(key))?.resource.invalidate()
  }

  invalidateWhere(matches: (key: K) => boolean) {
    for (const { key, resource } of this.entries.values()) {
      if (matches(key)) {
        resource.invalidate()
      }
    }
  }
}
