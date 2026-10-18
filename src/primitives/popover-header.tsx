interface PopoverHeaderProps {
  title: string
  meta: string
}

export function PopoverHeader({ title, meta }: PopoverHeaderProps) {
  return (
    <div className={'flex items-center justify-between border-b border-line px-2 py-1.5'}>
      <span className={'font-medium'}>{title}</span>
      <span className={'text-fg-muted'}>{meta}</span>
    </div>
  )
}
