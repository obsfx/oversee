import { EditorContent } from '@tiptap/react'
import { useCommentComposer } from '@/src/hooks/use-comment-composer.ts'
import type { ReviewComment } from '@/src/lib/comment-gateway.ts'
import type { LineRange } from '@/src/lib/line-range.ts'
import { Button } from '@/src/primitives/button.tsx'
import { CommentCard } from '@/src/primitives/comment-card.tsx'
import { ComposerBar } from '@/src/primitives/composer-bar.tsx'
import { ComposerFooter } from '@/src/primitives/composer-footer.tsx'
import { ShortcutHint } from '@/src/components/shortcut-hint.tsx'
import { MarkdownToolbar } from '@/src/components/diff-viewer/markdown-toolbar.tsx'

interface CommentComposerProps {
  path: string
  range: LineRange
  comment: ReviewComment | null
}

export function CommentComposer({ path, range, comment }: CommentComposerProps) {
  const { editor, submit, cancel, canSubmit, failed, submitLabel, label } = useCommentComposer({
    path,
    range,
    comment,
  })

  return (
    <CommentCard variant={'composer'}>
      <ComposerBar label={label}>
        <MarkdownToolbar editor={editor} />
      </ComposerBar>
      <EditorContent editor={editor} />
      <ComposerFooter
        hint={
          <>
            <ShortcutHint keys={['mod', 'enter']} label={'to send'} />
            <ShortcutHint keys={['escape']} label={'to cancel'} />
          </>
        }
        error={failed ? 'Could not save the comment. Try again.' : null}
      >
        <Button variant={'ghost'} onClick={cancel}>
          Cancel
        </Button>
        <Button variant={'accent-subtle'} disabled={!canSubmit} onClick={submit}>
          {submitLabel}
        </Button>
      </ComposerFooter>
    </CommentCard>
  )
}
