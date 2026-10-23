import { CountLabels } from '@/src/lib/count-labels.ts'
import type { FileChange } from '@/src/lib/change-set.ts'
import { DiffStatsRules } from '@/src/lib/diff-stats.ts'
import { PathParts } from '@/src/lib/path-parts.ts'
import { DiffStat } from '@/src/primitives/diff-stat.tsx'
import { DiffStatBlocks } from '@/src/primitives/diff-stat-blocks.tsx'
import { FilePathLabel } from '@/src/primitives/file-path-label.tsx'

const STAT_BLOCK_COUNT = 5

export function FileSummary({ file }: { file: FileChange }) {
  const { directory, name } = PathParts.split(file.path)
  const description = `${CountLabels.of(file.additions, 'addition')}, ${CountLabels.of(file.deletions, 'deletion')}`

  return (
    <>
      <FilePathLabel directory={directory} name={name} />
      <span title={description} aria-label={description} className={'flex items-center'}>
        <DiffStat additions={file.additions} deletions={file.deletions} />
        <DiffStatBlocks
          {...DiffStatsRules.blocks(file.additions, file.deletions, STAT_BLOCK_COUNT)}
        />
      </span>
    </>
  )
}
