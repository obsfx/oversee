interface FileProgressProps {
  position: number
  total: number
  percent: number
}

export function FileProgress({ position, total, percent }: FileProgressProps) {
  return (
    <div className={'flex flex-col gap-0.5 pl-1'}>
      <span className={'leading-3 text-fg-muted tabular-nums'}>
        {'File '}
        <span className={'text-fg'}>{position}</span>
        {` of ${total}`}
      </span>
      <span
        role={'progressbar'}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={position}
        aria-label={'File position'}
        className={'h-0.5 w-full overflow-hidden rounded-full bg-black/8 dark:bg-white/10'}
      >
        <span
          className={'block h-full rounded-full bg-fg-faint transition-[width] duration-200'}
          style={{ width: `${percent}%` }}
        />
      </span>
    </div>
  )
}
