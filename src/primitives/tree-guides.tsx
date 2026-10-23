import { TreeMetrics } from '@/src/lib/tree-metrics.ts'

export function TreeGuides({ depth }: { depth: number }) {
  const levels = Array.from({ length: TreeMetrics.indent(depth) }, (_, level) => {
    return level
  })
  return levels.map((level) => {
    return (
      <span
        key={level}
        aria-hidden={true}
        className={'absolute inset-y-0 w-px bg-sidebar-guide'}
        style={{ left: TreeMetrics.guide(level) }}
      />
    )
  })
}
