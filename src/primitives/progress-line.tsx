import { ProgressBar } from '@/src/primitives/progress-bar.tsx'

interface ProgressLineProps {
  label: string
  ratio: number | null
  phase: string
}

export function ProgressLine({ label, ratio, phase }: ProgressLineProps) {
  return (
    <div role={'status'} aria-busy={true} className={'flex shrink-0 flex-col'}>
      <ProgressBar label={label} ratio={ratio} />
      <span title={phase} className={'truncate px-2 py-1.5 text-sidebar-muted tabular-nums'}>
        {phase}
      </span>
    </div>
  )
}
