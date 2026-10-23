import { c } from '@/src/c.ts'
import { TreeMetrics } from '@/src/lib/tree-metrics.ts'

interface TreeConnectorsProps {
  depth: number
  last: boolean
  continues: readonly boolean[]
}

export function TreeConnectors({ depth, last, continues }: TreeConnectorsProps) {
  if (depth === 0) {
    return null
  }
  const indent = TreeMetrics.indent(depth)
  const elbow = TreeMetrics.guide(indent - 1)
  const shown = indent > 1 ? continues.slice(-(indent - 1)) : []
  return (
    <>
      {shown.map((passes, level) => {
        if (!passes) {
          return null
        }
        return (
          <span
            key={level}
            aria-hidden={true}
            className={'absolute inset-y-0 w-px bg-sidebar-guide'}
            style={{ left: TreeMetrics.guide(level) }}
          />
        )
      })}
      <span
        aria-hidden={true}
        className={c('absolute top-0 w-px bg-sidebar-guide', last ? 'h-1/2' : 'h-full')}
        style={{ left: elbow }}
      />
      <span
        aria-hidden={true}
        className={'absolute top-1/2 h-px bg-sidebar-guide'}
        style={{ left: elbow, width: TreeMetrics.elbowWidth() }}
      />
    </>
  )
}
