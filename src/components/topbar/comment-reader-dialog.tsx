import { Dialog } from '@base-ui/react/dialog'
import { CommentReplies } from '@/src/components/topbar/comment-replies.tsx'
import { SessionSnippet } from '@/src/components/topbar/session-snippet.tsx'
import { MarkdownView } from '@/src/components/markdown-view.tsx'
import { useCommentLocationOpener } from '@/src/hooks/use-comment-location-opener.ts'
import type { CommentReaderModel } from '@/src/hooks/use-comment-reader.ts'
import { useScrollReset } from '@/src/hooks/use-scroll-reset.ts'
import { CommentLists } from '@/src/lib/comment-lists.ts'
import { LineRanges } from '@/src/lib/line-range.ts'
import { CommentLocation } from '@/src/primitives/comment-location.tsx'
import { DialogSurface } from '@/src/primitives/dialog-surface.tsx'
import { OutdatedLabel } from '@/src/primitives/outdated-label.tsx'
import { PagerControl } from '@/src/primitives/pager-control.tsx'

interface CommentReaderDialogProps {
  reader: CommentReaderModel
  onNavigate: () => void
}

export function CommentReaderDialog({ reader, onNavigate }: CommentReaderDialogProps) {
  const { comment } = reader
  const body = useScrollReset(comment?.id ?? null)
  const openLocation = useCommentLocationOpener(() => {
    reader.close()
    onNavigate()
  })

  return (
    <Dialog.Root
      open={reader.open}
      onOpenChange={(open) => {
        if (!open) {
          reader.close()
        }
      }}
    >
      {comment && (
        <DialogSurface
          title={
            <CommentLocation
              size={'reader'}
              filePath={comment.filePath}
              location={LineRanges.shortLabel(comment.range)}
              onOpen={() => {
                openLocation(comment)
              }}
            >
              {CommentLists.isOutdated(comment) && <OutdatedLabel />}
            </CommentLocation>
          }
          actions={
            reader.count > 1 && (
              <PagerControl
                position={reader.position}
                count={reader.count}
                previousLabel={'Previous comment'}
                nextLabel={'Next comment'}
                previousDisabled={!reader.hasPrevious}
                nextDisabled={!reader.hasNext}
                onPrevious={reader.previous}
                onNext={reader.next}
              />
            )
          }
          bodyRef={body}
          onKeyDown={reader.handleKey}
        >
          <div className={'flex flex-col gap-4'}>
            <SessionSnippet size={'reader'} lines={comment.lines} filePath={comment.filePath} />
            <MarkdownView size={'reader'} body={comment.body} />
            <CommentReplies size={'reader'} replies={comment.replies} />
          </div>
        </DialogSurface>
      )}
    </Dialog.Root>
  )
}
