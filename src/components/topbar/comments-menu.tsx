import { Popover } from '@base-ui/react/popover'
import { useState } from 'react'
import { VscComment } from 'react-icons/vsc'
import { useComments } from '@/src/hooks/use-comments.ts'
import { CommentMarkdown } from '@/src/lib/comment-markdown.ts'
import { LineRanges } from '@/src/lib/line-range.ts'
import { CommentRow } from '@/src/primitives/comment-row.tsx'
import { IconButton } from '@/src/primitives/icon-button.tsx'
import { MutedHint } from '@/src/primitives/muted-hint.tsx'
import { OptionList } from '@/src/primitives/option-list.tsx'
import { PopoverHeader } from '@/src/primitives/popover-header.tsx'
import { PopoverSurface } from '@/src/primitives/popover-surface.tsx'

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
                location={LineRanges.shortLabel(comment.range)}
                body={CommentMarkdown.summary(comment.body)}
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
