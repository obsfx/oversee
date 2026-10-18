import { VscReply } from 'react-icons/vsc'

interface ReplyEntryProps {
  author: string
  age: string
  body: string
}

export function ReplyEntry({ author, age, body }: ReplyEntryProps) {
  return (
    <div className={'flex flex-col gap-0.5'}>
      <span className={'flex items-center gap-1 text-mini text-fg-muted'}>
        <VscReply className={'text-accent'} />
        <span className={'font-medium text-fg'}>{author}</span>
        <span className={'text-fg-faint'}>{age}</span>
      </span>
      <span>{body}</span>
    </div>
  )
}
