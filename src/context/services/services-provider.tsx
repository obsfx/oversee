import type { ReactNode } from 'react'
import type { Services } from '@/src/lib/services.ts'
import { ServicesContext } from '@/src/context/services/services-context.ts'

interface ServicesProviderProps {
  services: Services
  children: ReactNode
}

export function ServicesProvider({ services, children }: ServicesProviderProps) {
  return <ServicesContext value={services}>{children}</ServicesContext>
}
