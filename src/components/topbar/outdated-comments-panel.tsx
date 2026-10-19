import { VscTrash } from 'react-icons/vsc'
import { OutdatedCommentItem } from '@/src/components/topbar/outdated-comment-item.tsx'
import { useOutdatedComments } from '@/src/hooks/use-outdated-comments.ts'
import { Button } from '@/src/primitives/button.tsx'
import { DetailHeader } from '@/src/primitives/detail-header.tsx'
import { PopoverScrollArea } from '@/src/primitives/popover-scroll-area.tsx'

interface OutdatedCommentsPanelProps {
  onBack: () => void
  onNavigate: () => void
}

export function OutdatedCommentsPanel({ onBack, onNavigate }: OutdatedCommentsPanelProps) {
  const { outdated, deleteAll, deleting, failed } = useOutdatedComments()

  return (
    <>
      <DetailHeader backLabel={'Back to current comments'} onBack={onBack}>
        <span className={'font-medium'}>Outdated</span>
        <span className={'text-fg-faint tabular-nums'}>{outdated.length}</span>
        <Button variant={'ghost'} className={'ml-auto'} disabled={deleting} onClick={deleteAll}>
          <VscTrash />
          Delete all
        </Button>
      </DetailHeader>
      {failed && (
        <p className={'px-2 pt-1.5 text-danger'}>Could not delete every comment. Try again.</p>
      )}
      <PopoverScrollArea>
        <div className={'flex flex-col divide-y divide-line'}>
          {outdated.map((comment) => {
            return (
              <OutdatedCommentItem key={comment.id} comment={comment} onNavigate={onNavigate} />
            )
          })}
        </div>
      </PopoverScrollArea>
    </>
  )
}
