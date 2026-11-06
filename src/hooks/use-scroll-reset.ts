import { useLayoutEffect, useRef } from 'react'

export const useScrollReset = (key: string | null) => {
  const ref = useRef<HTMLDivElement | null>(null)

  useLayoutEffect(() => {
    ref.current?.scrollTo({ top: 0 })
  }, [key])

  return ref
}
