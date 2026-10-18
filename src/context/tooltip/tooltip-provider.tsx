import { Tooltip } from '@base-ui/react/tooltip'
import type { ReactNode } from 'react'

const OPEN_DELAY_MS = 180

export function TooltipProvider({ children }: { children: ReactNode }) {
  return <Tooltip.Provider delay={OPEN_DELAY_MS}>{children}</Tooltip.Provider>
}
