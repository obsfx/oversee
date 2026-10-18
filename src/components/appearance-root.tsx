import type { ReactNode } from 'react'
import { useAppearanceSync } from '../hooks/use-appearance-sync.ts'

export function AppearanceRoot({ children }: { children: ReactNode }) {
  useAppearanceSync()
  return children
}
