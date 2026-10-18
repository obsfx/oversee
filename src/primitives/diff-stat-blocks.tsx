import { c } from '@/src/c.ts'

interface DiffStatBlocksProps {
  added: number
  deleted: number
  neutral: number
}

const repeat = (count: number, className: string, keyPrefix: string) => {
  return Array.from({ length: count }, (_, index) => {
    return <span key={`${keyPrefix}${index}`} className={c('size-2 rounded-[2px]', className)} />
  })
}

export function DiffStatBlocks({ added, deleted, neutral }: DiffStatBlocksProps) {
  return (
    <span aria-hidden={true} className={'flex shrink-0 gap-px'}>
      {repeat(added, 'bg-status-added', 'added')}
      {repeat(deleted, 'bg-status-deleted', 'deleted')}
      {repeat(neutral, 'bg-black/10 dark:bg-white/10', 'neutral')}
    </span>
  )
}
