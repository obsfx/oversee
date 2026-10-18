import type { FileTree } from '@pierre/trees'
import { useState } from 'react'

export const useTreeFilter = (model: FileTree) => {
  const [value, setValue] = useState('')

  const apply = (next: string) => {
    setValue(next)
    model.setSearch(next === '' ? null : next)
  }

  const clear = () => {
    apply('')
  }

  return { value, apply, clear }
}
