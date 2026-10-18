interface CommentRowProps {
  filePath: string
  line: number
  body: string
  onSelect: () => void
}

export function CommentRow({ filePath, line, body, onSelect }: CommentRowProps) {
  return (
    <button
      type={'button'}
      onClick={onSelect}
      className={
        'block w-full cursor-pointer rounded px-1.5 py-1 text-left outline-none hover:bg-surface-hover focus-visible:bg-surface-hover'
      }
    >
      <span className={'flex items-center gap-1.5 text-[11px] text-fg-muted'}>
        <span className={'truncate'}>{filePath}</span>
        <span className={'shrink-0 font-editor text-fg-faint'}>L{line}</span>
      </span>
      <span className={'block truncate'}>{body}</span>
    </button>
  )
}
