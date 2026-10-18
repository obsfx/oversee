import { useState } from 'react'

type ActionStatus = 'idle' | 'pending' | 'failed'

export const useAsyncAction = <A extends unknown[]>(action: (...args: A) => Promise<unknown>) => {
  const [status, setStatus] = useState<ActionStatus>('idle')

  const run = async (...args: A) => {
    if (status === 'pending') {
      return false
    }
    setStatus('pending')
    try {
      await action(...args)
      setStatus('idle')
      return true
    } catch {
      setStatus('failed')
      return false
    }
  }

  const reset = () => {
    setStatus('idle')
  }

  return { run, reset, pending: status === 'pending', failed: status === 'failed' }
}
