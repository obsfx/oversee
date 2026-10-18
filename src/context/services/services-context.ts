import { createContext } from 'react'
import type { Services } from '../../lib/services.ts'

export const ServicesContext = createContext<Services | null>(null)
