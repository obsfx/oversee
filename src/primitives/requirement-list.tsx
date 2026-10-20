import { VscCheck, VscClose } from 'react-icons/vsc'
import { c } from '@/src/c.ts'

export interface RequirementItem {
  tool: string
  missing: boolean
  title: string
}

export function RequirementList({ items }: { items: RequirementItem[] }) {
  return (
    <span className={'flex min-w-0 flex-wrap items-center gap-x-1.5 text-mini'}>
      <span className={'text-fg-faint'}>Requires</span>
      {items.map((item) => {
        return (
          <span
            key={item.tool}
            title={item.title}
            className={c(
              'flex items-center gap-0.5',
              item.missing ? 'text-status-modified' : 'text-fg-muted',
            )}
          >
            {item.missing ? <VscClose /> : <VscCheck className={'text-reviewed'} />}
            {item.tool}
          </span>
        )
      })}
    </span>
  )
}
