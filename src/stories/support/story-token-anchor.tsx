import { type ReactNode, useState } from 'react'
import type { HoverToken } from '@/src/lib/definition-hover.ts'

interface StoryTokenAnchorProps {
  text: string
  children: (token: HoverToken | null) => ReactNode
}

export function StoryTokenAnchor({ text, children }: StoryTokenAnchorProps) {
  const [element, setElement] = useState<HTMLElement | null>(null)
  let token: HoverToken | null = null
  if (element) {
    token = {
      path: 'scripts/expire_password.ts',
      side: 'new',
      line: 28,
      character: 30,
      element,
    }
  }

  return (
    <div className={'p-6 font-editor text-xs'}>
      <span>const expiresAt = this.</span>
      <span ref={setElement} className={'underline underline-offset-2'}>
        {text}
      </span>
      <span>()</span>
      {children(token)}
    </div>
  )
}
