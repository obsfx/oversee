import { useState } from 'react'
import type { NumericRange } from '../lib/numeric-range.ts'

export const useNumericDraft = (
  value: number,
  range: NumericRange,
  onCommit: (value: number) => void,
) => {
  const [draft, setDraft] = useState(String(value))
  const isValid = range.parse(draft) !== null

  const change = (raw: string) => {
    setDraft(raw)
    const parsed = range.parse(raw)
    if (parsed !== null) {
      onCommit(parsed)
    }
  }

  const revertIfInvalid = () => {
    if (!isValid) {
      setDraft(String(value))
    }
  }

  return { draft, isValid, change, revertIfInvalid }
}
