import type { ReactNode } from 'react'

interface SettingRowProps {
  label: string
  error?: string | null
  children: ReactNode
}

export function SettingRow({ label, error, children }: SettingRowProps) {
  return (
    <div className={'grid grid-cols-[minmax(0,1fr)_9rem] items-center gap-x-2 gap-y-0.5'}>
      <span className={'truncate whitespace-nowrap text-fg-muted'} title={label}>
        {label}
      </span>
      <div className={'flex h-6 items-center justify-end'}>{children}</div>
      {error && (
        <span className={'col-span-2 justify-self-end text-[11px] text-danger'}>{error}</span>
      )}
    </div>
  )
}
