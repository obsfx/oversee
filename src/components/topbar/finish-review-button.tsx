import { Popover } from '@base-ui/react/popover'
import { VscCheck } from 'react-icons/vsc'
import { useFinishReview } from '@/src/hooks/use-finish-review.ts'
import { Button } from '@/src/primitives/button.tsx'
import { ConfirmPrompt } from '@/src/primitives/confirm-prompt.tsx'
import { PopoverSurface } from '@/src/primitives/popover-surface.tsx'

export function FinishReviewButton() {
  const { active, finishing, failed, finish, summary, confirmOpen, setConfirmOpen } =
    useFinishReview()
  if (!active) {
    return null
  }

  return (
    <Popover.Root open={confirmOpen} onOpenChange={setConfirmOpen}>
      <Popover.Trigger render={<Button variant={'accent-subtle'} />}>
        <VscCheck />
        Finish review
      </Popover.Trigger>
      <PopoverSurface align={'end'} className={'w-64'}>
        <ConfirmPrompt
          title={'Finish this review?'}
          description={summary}
          error={failed ? 'Could not finish the review. Try again.' : undefined}
        >
          <Popover.Close render={<Button variant={'ghost'} />}>Cancel</Popover.Close>
          <Button
            variant={'accent-subtle'}
            disabled={finishing}
            onClick={() => {
              void finish()
            }}
          >
            {finishing ? 'Finishing' : 'Finish review'}
          </Button>
        </ConfirmPrompt>
      </PopoverSurface>
    </Popover.Root>
  )
}
