import { Popover } from '@base-ui/react/popover'
import { useState } from 'react'
import { VscComment } from 'react-icons/vsc'
import { useComments } from '../../hooks/use-comments.ts'
import { CommentRow } from '../../primitives/comment-row.tsx'
import { IconButton } from '../../primitives/icon-button.tsx'
import { MutedHint } from '../../primitives/muted-hint.tsx'
import { OptionList } from '../../primitives/option-list.tsx'
import { PopoverHeader } from '../../primitives/popover-header.tsx'
import { PopoverSurface } from '../../primitives/popover-surface.tsx'

export function CommentsMenu() {
  const { state, list, countLabel, focusComment } = useComments()
  const [open, setOpen] = useState(false)

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger render={<IconButton />} title={countLabel} aria-label={countLabel}>
        <VscComment />
        <span className={'text-xs tabular-nums'}>{list.length}</span>
      </Popover.Trigger>
      <PopoverSurface align={'end'} className={'w-80'}>
        <PopoverHeader title={'Comments'} meta={countLabel} />
        <OptionList>
          <div className={'pt-1'} />
          {state.status === 'loading' && <MutedHint>Loading comments</MutedHint>}
          {state.status === 'failed' && <MutedHint>Could not load comments</MutedHint>}
          {state.status === 'ready' && list.length === 0 && <MutedHint>No comments yet</MutedHint>}
          {list.map((comment) => {
            return (
              <CommentRow
                key={comment.id}
                filePath={comment.filePath}
                line={comment.line}
                body={comment.body}
                onSelect={() => {
                  focusComment(comment)
                  setOpen(false)
                }}
              />
            )
          })}
        </OptionList>
      </PopoverSurface>
    </Popover.Root>
  )
}
