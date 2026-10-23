interface TreeGroupLabelProps {
  label: string
  count: number
}

export function TreeGroupLabel({ label, count }: TreeGroupLabelProps) {
  return (
    <span className={'flex min-w-0 flex-1 items-center gap-1 text-sidebar-muted'}>
      <span className={'truncate font-medium'}>{label}</span>
      <span className={'text-mini tabular-nums'}>{count}</span>
    </span>
  )
}
