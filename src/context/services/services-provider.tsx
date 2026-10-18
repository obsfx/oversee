import type { ReactNode } from 'react'
import type { Services } from '../../lib/services.ts'
import { ServicesContext } from './services-context.ts'

interface ServicesProviderProps {
  services: Services
  children: ReactNode
}

export function ServicesProvider({ services, children }: ServicesProviderProps) {
  return <ServicesContext value={services}>{children}</ServicesContext>
}
