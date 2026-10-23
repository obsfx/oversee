import { useEffect, useEffectEvent, useState } from 'react'
import { Errors } from '@/src/lib/errors.ts'

export type KeyedPromiseState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; value: T }
  | { status: 'failed'; error: Error }

export interface KeyedRequest<T> {
  key: string
  load: () => Promise<T>
}

interface SettledPromise<T> {
  key: string
  state: KeyedPromiseState<T>
}

export const useKeyedPromise = <T>(request: KeyedRequest<T> | null): KeyedPromiseState<T> => {
  const [settled, setSettled] = useState<SettledPromise<T> | null>(null)
  const key = request?.key ?? null
  const latestRequest = useEffectEvent(() => {
    return request
  })

  useEffect(() => {
    const current = latestRequest()
    if (current === null) {
      return
    }
    let active = true
    current.load().then(
      (value) => {
        if (active) {
          setSettled({ key: current.key, state: { status: 'ready', value } })
        }
      },
      (error: unknown) => {
        if (active) {
          setSettled({ key: current.key, state: { status: 'failed', error: Errors.of(error) } })
        }
      },
    )
    return () => {
      active = false
    }
  }, [key])

  if (key === null) {
    return { status: 'idle' }
  }
  if (settled !== null && settled.key === key) {
    return settled.state
  }
  return { status: 'loading' }
}
