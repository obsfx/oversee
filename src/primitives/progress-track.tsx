interface ProgressTrackProps {
  reviewed: number
  total: number
  percent: number
}

export function ProgressTrack({ reviewed, total, percent }: ProgressTrackProps) {
  return (
    <div className={'flex min-w-0 flex-1 flex-col gap-1'}>
      <span className={'truncate text-sidebar-muted'}>
        <span className={'font-semibold text-sidebar-fg tabular-nums'}>{reviewed}</span>
        {` of ${total} reviewed`}
      </span>
      <div
        role={'progressbar'}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={reviewed}
        className={'h-1 overflow-hidden rounded-full bg-black/8 dark:bg-white/8'}
      >
        <div
          className={
            'h-full rounded-full bg-linear-to-r from-reviewed-soft to-reviewed transition-[width] duration-300'
          }
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
