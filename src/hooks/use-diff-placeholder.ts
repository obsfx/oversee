import type { FileChange } from '@/src/lib/change-set.ts'
import { DiffPlaceholders } from '@/src/lib/diff-placeholders.ts'
import type { ShownDiff } from '@/src/hooks/use-file-diff.ts'
import { useChangeSet } from '@/src/hooks/use-change-set.ts'
import { useComparison } from '@/src/hooks/use-comparison.ts'

export const useDiffPlaceholder = (change: FileChange | null, shown: ShownDiff | null) => {
  const { comparison } = useComparison()
  const { state } = useChangeSet()
  return DiffPlaceholders.of({ changeSet: state, comparison, change, shown })
}
