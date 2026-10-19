import { CommentLocation } from '@/src/primitives/comment-location.tsx'

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
      <CommentLocation filePath={filePath} location={location} />
      <span className={'block truncate'}>{body}</span>
    </button>
  )
}
