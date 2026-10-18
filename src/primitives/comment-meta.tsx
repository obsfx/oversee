export function CommentMeta({ items }: { items: string[] }) {
  return (
    <p className={'flex gap-2 pt-1 text-mini text-fg-faint'}>
      {items.map((item, index) => {
        return (
          <span key={item} className={index === 0 ? 'font-editor' : undefined}>
            {item}
          </span>
        )
      })}
    </p>
  )
}
