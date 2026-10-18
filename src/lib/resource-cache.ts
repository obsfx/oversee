import { AsyncResource } from './async-resource.ts'

export class ResourceCache<K, T> {
  private readonly resources = new Map<string, AsyncResource<T>>()
  private readonly keyOf: (key: K) => string
  private readonly fetcher: (key: K) => Promise<T>

  constructor(keyOf: (key: K) => string, fetcher: (key: K) => Promise<T>) {
    this.keyOf = keyOf
    this.fetcher = fetcher
  }

  get(key: K) {
    const id = this.keyOf(key)
    const existing = this.resources.get(id)
    if (existing) {
      return existing
    }
    const resource = new AsyncResource(() => {
      return this.fetcher(key)
    })
    this.resources.set(id, resource)
    return resource
  }
}
