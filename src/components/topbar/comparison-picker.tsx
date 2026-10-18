import { Popover } from '@base-ui/react/popover'
import { VscArrowRight, VscChevronDown, VscGitCompare } from 'react-icons/vsc'
import { useComparison } from '@/src/hooks/use-comparison.ts'
import { ComparisonRules } from '@/src/lib/comparison-rules.ts'
import { ChipButton } from '@/src/primitives/chip-button.tsx'
import { PopoverSurface } from '@/src/primitives/popover-surface.tsx'
import { BranchOptions } from '@/src/components/topbar/branch-options.tsx'
import { ComparisonPickerFailed } from '@/src/components/topbar/comparison-picker-failed.tsx'
import { ComparisonPickerLoading } from '@/src/components/topbar/comparison-picker-loading.tsx'

export function ComparisonPicker() {
  const { branchesState, comparison, selectSource, selectTarget, retry } = useComparison()

  if (branchesState.status === 'failed') {
    return <ComparisonPickerFailed reason={branchesState.error.message} onRetry={retry} />
  }

  if (branchesState.status !== 'ready' || !comparison) {
    return <ComparisonPickerLoading />
  }

  const { branches, remoteBranches } = branchesState.data
  const sourceLabel = ComparisonRules.sourceLabel(comparison.source)
  const sourceBranch = comparison.source.kind === 'branch' ? comparison.source.name : null
  const description = `Compare ${sourceLabel} to ${comparison.target}`

  return (
    <Popover.Root>
      <Popover.Trigger render={<ChipButton />} title={description} aria-label={description}>
        <VscGitCompare className={'shrink-0 text-fg-muted'} />
        <span className={'truncate font-medium'}>{sourceLabel}</span>
        <VscArrowRight className={'shrink-0 text-fg-faint'} />
        <span className={'truncate text-fg-muted'}>{comparison.target}</span>
        <VscChevronDown className={'shrink-0 text-fg-faint'} />
      </Popover.Trigger>
      <PopoverSurface align={'start'} className={'flex divide-x divide-line'}>
        <BranchOptions
          placeholder={'Filter source'}
          branches={branches}
          remoteBranches={remoteBranches}
          selected={sourceBranch}
          onSelect={(branch) => {
            selectSource(ComparisonRules.branch(branch))
          }}
          pinned={{
            label: ComparisonRules.uncommittedLabel,
            selected: comparison.source.kind === 'uncommitted',
            onSelect: () => {
              selectSource(ComparisonRules.uncommitted)
            },
          }}
        />
        <BranchOptions
          placeholder={'Filter target'}
          branches={branches}
          remoteBranches={remoteBranches}
          selected={comparison.target}
          onSelect={selectTarget}
        />
      </PopoverSurface>
    </Popover.Root>
  )
}
