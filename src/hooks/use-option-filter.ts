import { useState } from 'react'

export const useOptionFilter = (options: string[]) => {
  const [query, setQuery] = useState('')
  const needle = query.trim().toLowerCase()
  const filtered = needle
    ? options.filter((option) => {
        return option.toLowerCase().includes(needle)
      })
    : options
  return { query, setQuery, filtered, isFiltering: needle.length > 0 }
}
