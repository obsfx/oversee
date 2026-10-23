import { createStore, type StoreApi } from 'zustand/vanilla'
import { Errors } from '@/src/lib/errors.ts'

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
  private refreshing: Promise<void> | null = null
  private dirty = false
  private watchers = 0
  private stale = false
  private refreshTicket = 0

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
          this.store.setState({ status: 'failed', error: Errors.of(error) }, true)
        },
      )
      .finally(() => {
        this.pending = null
      })
    return this.pending
  }

  follow(listener: (state: ResourceState<T>) => void) {
    listener(this.store.getState())
    return this.store.subscribe(listener)
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
    if (this.refreshing) {
      this.refreshTicket += 1
      void this.refresh()
    }
  }

  refresh() {
    if (this.refreshing) {
      this.dirty = true
      return this.refreshing
    }
    this.refreshing = this.refreshWhileDirty()
    return this.refreshing
  }

  private async refreshWhileDirty() {
    try {
      do {
        this.dirty = false
        await this.refreshOnce()
      } while (this.dirty)
    } finally {
      this.refreshing = null
    }
  }

  private async refreshOnce() {
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
