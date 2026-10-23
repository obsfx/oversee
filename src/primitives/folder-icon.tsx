const TAB = 'M1.5 3.6a1.1 1.1 0 0 1 1.1-1.1h2.9a1 1 0 0 1 .72.3L7.5 4.1H1.5Z'

const BODY_CLOSED = 'M2 4.6h11.5a.5.5 0 0 1 .5.5v7.4a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5Z'

const BODY_OPEN = 'M2 4.6h11a.5.5 0 0 1 .5.5v1.4H4.4a1 1 0 0 0-.95.69L2 11.6Z'

const FLAP_OPEN =
  'M4.15 7.45a.6.6 0 0 1 .57-.45h10.04a.5.5 0 0 1 .47.66l-1.75 5a.5.5 0 0 1-.47.34H2.2Z'

const PANEL = 'fill-folder/34 stroke-folder-edge'

export function FolderIcon({ open }: { open: boolean }) {
  return (
    <svg aria-hidden={true} viewBox={'0 0 16 16'} className={'size-3.5 shrink-0'}>
      <path
        d={open ? BODY_OPEN : BODY_CLOSED}
        strokeWidth={1}
        strokeLinejoin={'round'}
        className={PANEL}
      />
      {open && <path d={FLAP_OPEN} strokeWidth={1} strokeLinejoin={'round'} className={PANEL} />}
      <path d={TAB} className={'fill-folder-tab'} />
    </svg>
  )
}
