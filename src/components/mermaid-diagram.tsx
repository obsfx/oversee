import { useMermaidDiagram } from '@/src/hooks/use-mermaid-diagram.ts'
import { DiagramSurface } from '@/src/primitives/diagram-surface.tsx'

export function MermaidDiagram({ source }: { source: string }) {
  const { container, failed } = useMermaidDiagram(source)

  return (
    <DiagramSurface
      ref={container}
      fallback={
        failed && (
          <pre>
            <code>{source}</code>
          </pre>
        )
      }
    />
  )
}
