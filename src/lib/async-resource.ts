import { createStore, type StoreApi } from 'zustand/vanilla'

export type ResourceState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; data: T }
  | { status: 'failed'; error: Error }

export class AsyncResource<T> {
  readonly store: StoreApi<ResourceState<T>>
  private readonly fetcher: () => Promise<T>
  private pending: Promise<void> | null = null

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

  update(change: (data: T) => T) {
    const state = this.store.getState()
    if (state.status === 'ready') {
      this.store.setState({ status: 'ready', data: change(state.data) }, true)
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
