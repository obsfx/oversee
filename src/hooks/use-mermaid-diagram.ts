import { useEffect, useRef, useState } from 'react'
import { MermaidDiagrams } from '@/src/lib/mermaid-diagrams.ts'

export const useMermaidDiagram = (source: string) => {
  const container = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const element = container.current
    if (!element) {
      return
    }
    return MermaidDiagrams.mount(element, source, setFailed)
  }, [source])

  return { container, failed }
}
