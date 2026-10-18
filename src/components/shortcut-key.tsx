import type { ReactNode } from 'react'
import { MdKeyboardCommandKey, MdKeyboardReturn } from 'react-icons/md'
import { type KeyName, KeyboardKeys, type KeySymbol } from '@/src/lib/keyboard-keys.ts'
import { Kbd } from '@/src/primitives/kbd.tsx'

const SYMBOLS: Record<KeySymbol, ReactNode> = {
  command: <MdKeyboardCommandKey aria-hidden />,
  return: <MdKeyboardReturn aria-hidden />,
}

export function ShortcutKey({ name }: { name: KeyName }) {
  const { title, text, symbol } = KeyboardKeys.display(name)

  return (
    <Kbd title={title} aria-label={title}>
      {symbol ? SYMBOLS[symbol] : text}
    </Kbd>
  )
}
