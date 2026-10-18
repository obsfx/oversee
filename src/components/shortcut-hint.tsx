import type { KeyName } from '@/src/lib/keyboard-keys.ts'
import { KbdGroup } from '@/src/primitives/kbd-group.tsx'
import { ShortcutKey } from '@/src/components/shortcut-key.tsx'

interface ShortcutHintProps {
  keys: KeyName[]
  label: string
}

export function ShortcutHint({ keys, label }: ShortcutHintProps) {
  return (
    <span className={'inline-flex items-center gap-1'}>
      <KbdGroup>
        {keys.map((key) => {
          return <ShortcutKey key={key} name={key} />
        })}
      </KbdGroup>
      <span>{label}</span>
    </span>
  )
}
