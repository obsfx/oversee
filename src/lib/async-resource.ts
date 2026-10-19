import { createStore, type StoreApi } from 'zustand/vanilla'

export type ResourceState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; data: T }
  | { status: 'failed'; error: Error }

export abstract class ResourceStates {
  static dataOr<T, F>(state: ResourceState<T>, fallback: F): T | F {
    return state.status === 'ready' ? state.data : fallback
  }
}

export class AsyncResource<T> {
  readonly store: StoreApi<ResourceState<T>>
  private readonly fetcher: () => Promise<T>
  private pending: Promise<void> | null = null
  private watchers = 0
  private stale = false
  private refreshTicket = 0
  private settledTicket = 0

  constructor(fetcher: () => Promise<T>) {
    this.fetcher = fetcher
    this.store = createStore<ResourceState<T>>()(() => {
      return { status: 'idle' }
    })
  }

  load() {
    if (this.pending) {
      return this.pending
    }
    if (this.store.getState().status === 'ready') {
      return Promise.resolve()
    }
    this.store.setState({ status: 'loading' }, true)
    this.pending = this.fetcher()
      .then(
        (data) => {
          this.store.setState({ status: 'ready', data }, true)
        },
        (error: unknown) => {
          const failure = error instanceof Error ? error : new Error(String(error))
          this.store.setState({ status: 'failed', error: failure }, true)
        },
      )
      .finally(() => {
        this.pending = null
      })
    return this.pending
  }

  watch() {
    this.watchers += 1
    if (this.stale) {
      void this.refresh()
    }
    return () => {
      this.watchers -= 1
    }
  }

  invalidate() {
    if (this.store.getState().status === 'idle') {
      return
    }
    this.stale = true
    if (this.watchers > 0) {
      void this.refresh()
    }
  }

  update(change: (data: T) => T) {
    const state = this.store.getState()
    if (state.status !== 'ready') {
      return
    }
    this.store.setState({ status: 'ready', data: change(state.data) }, true)
    if (this.refreshTicket !== this.settledTicket) {
      void this.refresh()
    }
  }

  async refresh() {
    if (this.pending) {
      await this.pending
    }
    if (this.store.getState().status !== 'ready') {
      return
    }
    this.refreshTicket += 1
    const ticket = this.refreshTicket
    try {
      const data = await this.fetcher()
      if (ticket === this.refreshTicket) {
        this.stale = false
        this.store.setState({ status: 'ready', data }, true)
      }
    } catch {
      return
    } finally {
      if (ticket === this.refreshTicket) {
        this.settledTicket = ticket
      }
    }
  }

  reload() {
    if (this.pending) {
      return this.pending
    }
    this.store.setState({ status: 'idle' }, true)
    return this.load()
  }
}
