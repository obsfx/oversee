import type { ReactNode } from 'react'

interface ConfirmPromptProps {
  title: string
  description: string
  error?: string
  children: ReactNode
}

export function ConfirmPrompt({ title, description, error, children }: ConfirmPromptProps) {
  return (
    <div className={'p-2.5'}>
      <p className={'font-medium'}>{title}</p>
      <p className={'mt-0.5 text-fg-muted'}>{description}</p>
      {error && <p className={'mt-1.5 text-danger'}>{error}</p>}
      <div className={'mt-2.5 flex justify-end gap-1.5'}>{children}</div>
    </div>
  )
}
