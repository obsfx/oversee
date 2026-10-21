import { StartTruncate } from '@/src/primitives/start-truncate.tsx'

interface FilePathLabelProps {
  directory: string
  name: string
}

export function FilePathLabel({ directory, name }: FilePathLabelProps) {
  return (
    <StartTruncate title={`${directory}${name}`}>
      <span className={'text-fg-muted'}>{directory}</span>
      <span className={'font-medium text-fg'}>{name}</span>
    </StartTruncate>
  )
}
