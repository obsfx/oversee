import { useContext } from 'react'
import { ServicesContext } from '@/src/context/services/services-context.ts'

export const useServices = () => {
  const services = useContext(ServicesContext)
  if (!services) {
    throw new Error('useServices must be used inside ServicesProvider')
  }
  return services
}
