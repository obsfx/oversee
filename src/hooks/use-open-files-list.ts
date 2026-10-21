import { useState } from 'react'
import { PathParts } from '@/src/lib/path-parts.ts'

export interface OpenFile {
  id: string
  name: string
  directory: string
  path: string
  active: boolean
  select: () => void
}

const FILTER_FROM = 10

export const useOpenFilesList = (files: OpenFile[]) => {
  const [query, setQuery] = useState('')

  return {
    query,
    setQuery,
    filterable: files.length > FILTER_FROM,
    files: files.filter((file) => {
      return PathParts.matches(file.path, query)
    }),
    onOpenChange: (open: boolean) => {
      if (!open) {
        setQuery('')
      }
    },
  }
}
