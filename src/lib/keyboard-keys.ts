import { Platform } from '@/src/lib/platform.ts'

export type KeyName = 'mod' | 'enter' | 'escape'

export type KeySymbol = 'command' | 'return'

export interface KeyDisplay {
  title: string
  text: string | null
  symbol: KeySymbol | null
}

const APPLE_KEYS: Record<KeyName, KeyDisplay> = {
  mod: { title: 'Command', text: null, symbol: 'command' },
  enter: { title: 'Return', text: null, symbol: 'return' },
  escape: { title: 'Escape', text: 'Esc', symbol: null },
}

const DEFAULT_KEYS: Record<KeyName, KeyDisplay> = {
  mod: { title: 'Control', text: 'Ctrl', symbol: null },
  enter: { title: 'Enter', text: 'Enter', symbol: null },
  escape: { title: 'Escape', text: 'Esc', symbol: null },
}

export abstract class KeyboardKeys {
  static display(key: KeyName, apple: boolean = Platform.isApple): KeyDisplay {
    return (apple ? APPLE_KEYS : DEFAULT_KEYS)[key]
  }
}
