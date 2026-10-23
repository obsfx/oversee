import { c } from '@/src/c.ts'

interface ProgressBarProps {
  label: string
  ratio: number | null
  className?: string
}

export function ProgressBar({ label, ratio, className }: ProgressBarProps) {
  let fill = (
    <div
      className={c(
        'h-full w-1/3 animate-loading-bar bg-accent',
        'motion-reduce:w-full motion-reduce:animate-pulse',
      )}
    />
  )
  let value
  if (ratio !== null) {
    value = Math.round(ratio * 100)
    fill = (
      <div
        className={c(
          'h-full origin-left bg-accent',
          'transition-[scale] duration-150 ease-linear motion-reduce:transition-none',
        )}
        style={{ scale: `${ratio} 1` }}
      />
    )
  }

  return (
    <div
      role={'progressbar'}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      className={c('h-0.5 overflow-hidden bg-accent/15', className)}
    >
      {fill}
    </div>
  )
}
