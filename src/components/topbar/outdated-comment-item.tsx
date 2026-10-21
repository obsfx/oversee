import { VscGoToFile, VscTrash } from 'react-icons/vsc'
import { SessionSnippet } from '@/src/components/topbar/session-snippet.tsx'
import { MarkdownView } from '@/src/components/markdown-view.tsx'
import { useOutdatedComment } from '@/src/hooks/use-outdated-comment.ts'
import type { ReviewComment } from '@/src/lib/comment-gateway.ts'
import { Button } from '@/src/primitives/button.tsx'
import { OutdatedCommentCard } from '@/src/primitives/outdated-comment-card.tsx'

interface OutdatedCommentItemProps {
  comment: ReviewComment
  onNavigate: () => void
}

export function OutdatedCommentItem({ comment, onNavigate }: OutdatedCommentItemProps) {
  const { location, age, remove, removing, failed, openFile } = useOutdatedComment(
    comment,
    onNavigate,
  )

  return (
    <OutdatedCommentCard
      filePath={comment.filePath}
      location={location}
      age={age}
      snippet={<SessionSnippet lines={comment.lines} filePath={comment.filePath} />}
      body={<MarkdownView body={comment.body} />}
      error={failed ? 'Could not delete the comment.' : undefined}
      onOpenFile={openFile}
      actions={
        <>
          <Button variant={'ghost'} onClick={openFile}>
            <VscGoToFile />
            Open file
          </Button>
          <Button variant={'ghost'} disabled={removing} onClick={remove}>
            <VscTrash />
            Delete
          </Button>
        </>
      }
    />
  )
}
