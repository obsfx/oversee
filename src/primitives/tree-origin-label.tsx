import { LuCornerLeftUp } from 'react-icons/lu'

interface TreeOriginLabelProps {
  text: string
  title: string
}

export function TreeOriginLabel({ text, title }: TreeOriginLabelProps) {
  return (
    <span
      title={title}
      className={'flex min-w-0 flex-1 items-center gap-1 text-sidebar-muted italic'}
    >
      <LuCornerLeftUp className={'size-3 shrink-0'} />
      <span className={'truncate pr-0.5'}>{text}</span>
    </span>
  )
}
