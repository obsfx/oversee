interface FilePathLabelProps {
  directory: string
  name: string
}

export function FilePathLabel({ directory, name }: FilePathLabelProps) {
  return (
    <span title={`${directory}${name}`} dir={'rtl'} className={'min-w-0 truncate'}>
      <bdi>
        <span className={'text-fg-muted'}>{directory}</span>
        <span className={'font-medium text-fg'}>{name}</span>
      </bdi>
    </span>
  )
}
