import { useReviewedToggle } from '@/src/hooks/use-reviewed-toggle.ts'
import { CheckToggle } from '@/src/primitives/check-toggle.tsx'

interface ReviewedToggleProps {
  path: string
  onMarked: () => void
}

export function ReviewedToggle({ path, onMarked }: ReviewedToggleProps) {
  const { reviewed, toggle, title } = useReviewedToggle(path, onMarked)

  return (
    <CheckToggle checked={reviewed} title={title} onClick={toggle}>
      Reviewed
    </CheckToggle>
  )
}
