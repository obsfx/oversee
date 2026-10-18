import { useEffect } from 'react'
import { useStore } from 'zustand'
import type { AsyncResource } from '../lib/async-resource.ts'

export const useResource = <T>(resource: AsyncResource<T>) => {
  useEffect(() => {
    void resource.load()
  }, [resource])
  return useStore(resource.store)
}
