interface CommentRowProps {
  filePath: string
  location: string
  body: string
  onSelect: () => void
}

export function CommentRow({ filePath, location, body, onSelect }: CommentRowProps) {
  return (
    <button
      type={'button'}
      onClick={onSelect}
      className={
        'block w-full cursor-pointer rounded px-1.5 py-1 text-left outline-none hover:bg-surface-hover focus-visible:bg-surface-hover'
      }
    >
      <span className={'flex items-center gap-1.5 text-mini text-fg-muted'}>
        <span className={'truncate'}>{filePath}</span>
        <span className={'shrink-0 font-editor text-fg-faint'}>{location}</span>
      </span>
      <span className={'block truncate'}>{body}</span>
    </button>
  )
}
