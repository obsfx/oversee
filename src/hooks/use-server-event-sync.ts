import { useEffect } from 'react'
import { useServices } from '@/src/context/services/use-services.ts'

export const useServerEventSync = () => {
  const { serverSync } = useServices()

  useEffect(() => {
    return serverSync.start()
  }, [serverSync])
}
