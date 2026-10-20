import { useState } from 'react'
import { useServices } from '@/src/context/services/use-services.ts'
import {
  LanguageServerLabels,
  type LanguageServerRequest,
} from '@/src/lib/language-server-labels.ts'

export const useLanguageServerActions = () => {
  const services = useServices()
  const [failures, setFailures] = useState<ReadonlyMap<string, string>>(new Map())

  const run = (id: string, action: LanguageServerRequest, request: () => Promise<void>) => {
    setFailures((current) => {
      const next = new Map(current)
      next.delete(id)
      return next
    })
    request().catch((error: unknown) => {
      setFailures((current) => {
        return new Map(current).set(id, LanguageServerLabels.requestFailed(action, error))
      })
    })
  }

  return {
    failures,
    install: (id: string) => {
      run(id, 'install', () => {
        return services.languageServers.install(id)
      })
    },
    uninstall: (id: string) => {
      run(id, 'remove', () => {
        return services.languageServers.uninstall(id)
      })
    },
    cancel: (id: string) => {
      run(id, 'cancel', () => {
        return services.languageServers.cancel(id)
      })
    },
  }
}
