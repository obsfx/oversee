import { useState } from 'react'
import { TextQueries } from '@/src/lib/text-queries.ts'

export const useOptionFilter = (options: string[]) => {
  const [query, setQuery] = useState('')
  const isFiltering = TextQueries.isActive(query)
  let filtered = options
  if (isFiltering) {
    filtered = options.filter((option) => {
      return TextQueries.matches(option, query)
    })
  }
  return { query, setQuery, filtered, isFiltering }
}
