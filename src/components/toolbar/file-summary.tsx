import plur from 'plur'
import type { FileChange } from '../../lib/change-set.ts'
import { DiffStatsRules } from '../../lib/diff-stats.ts'
import { TreePaths } from '../../lib/tree-paths.ts'
import { DiffStat } from '../../primitives/diff-stat.tsx'
import { DiffStatBlocks } from '../../primitives/diff-stat-blocks.tsx'
import { FilePathLabel } from '../../primitives/file-path-label.tsx'

const STAT_BLOCK_COUNT = 5

export function FileSummary({ file }: { file: FileChange }) {
  const { directory, name } = TreePaths.split(file.path)
  const description = `${file.additions} ${plur('addition', file.additions)}, ${file.deletions} ${plur('deletion', file.deletions)}`

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
