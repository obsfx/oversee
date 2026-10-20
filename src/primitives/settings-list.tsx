import type { ReactNode } from 'react'

export function SettingsList({ children }: { children: ReactNode }) {
  return (
    <div className={'-mx-1 flex max-h-80 flex-col overflow-auto overscroll-contain'}>
      {children}
    </div>
  )
}
