import { useEffect } from 'react'
import { useStore } from 'zustand'
import { createStore, type StoreApi } from 'zustand/vanilla'
import type { AsyncResource, ResourceState } from '@/src/lib/async-resource.ts'

const idleStore = createStore<ResourceState<never>>()(() => {
  return { status: 'idle' }
})

export const useResource = <T>(resource: AsyncResource<T> | null) => {
  useEffect(() => {
    void resource?.load()
  }, [resource])
  const store = resource ? resource.store : (idleStore as StoreApi<ResourceState<T>>)
  return useStore(store)
}
