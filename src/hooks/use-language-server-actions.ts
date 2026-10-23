import { useServices } from '@/src/context/services/use-services.ts'
import {
  LanguageServerLabels,
  type LanguageServerRequest,
} from '@/src/lib/language-server-labels.ts'
import { useLanguageServerStore } from '@/src/store/language-server-store.ts'

export const useLanguageServerActions = () => {
  const services = useServices()
  const failures = useLanguageServerStore((state) => {
    return state.requestFailures
  })

  const run = (id: string, action: LanguageServerRequest, request: () => Promise<void>) => {
    useLanguageServerStore.getState().clearRequestFailure(id)
    request().catch((error: unknown) => {
      useLanguageServerStore
        .getState()
        .failRequest(id, LanguageServerLabels.requestFailed(action, error))
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
