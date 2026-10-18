import { VscEdit, VscGitBranch } from 'react-icons/vsc'
import { useOptionFilter } from '@/src/hooks/use-option-filter.ts'
import { BareInput } from '@/src/primitives/bare-input.tsx'
import { MutedHint } from '@/src/primitives/muted-hint.tsx'
import { OptionGroupLabel } from '@/src/primitives/option-group-label.tsx'
import { OptionList } from '@/src/primitives/option-list.tsx'
import { OptionRow } from '@/src/primitives/option-row.tsx'
import { SearchField } from '@/src/primitives/search-field.tsx'

interface PinnedOption {
  label: string
  selected: boolean
  onSelect: () => void
}

interface BranchOptionsProps {
  placeholder: string
  branches: string[]
  remoteBranches: string[]
  selected: string | null
  onSelect: (branch: string) => void
  pinned?: PinnedOption
}

export function BranchOptions({
  placeholder,
  branches,
  remoteBranches,
  selected,
  onSelect,
  pinned,
}: BranchOptionsProps) {
  const { query, setQuery, filtered, isFiltering } = useOptionFilter([
    ...branches,
    ...remoteBranches,
  ])
  const showPinned = pinned && !isFiltering
  const remotes = new Set(remoteBranches)
  const local = filtered.filter((branch) => {
    return !remotes.has(branch)
  })
  const remote = filtered.filter((branch) => {
    return remotes.has(branch)
  })
  const renderBranch = (branch: string) => {
    return (
      <OptionRow
        key={branch}
        icon={VscGitBranch}
        label={branch}
        selected={branch === selected}
        onSelect={() => {
          return onSelect(branch)
        }}
      />
    )
  }

  return (
    <div className={'flex w-64 flex-col'}>
      <SearchField>
        <BareInput
          value={query}
          placeholder={placeholder}
          aria-label={placeholder}
          onChange={(event) => {
            return setQuery(event.target.value)
          }}
        />
      </SearchField>
      <OptionList>
        {showPinned && (
          <>
            <OptionRow
              icon={VscEdit}
              label={pinned.label}
              selected={pinned.selected}
              onSelect={pinned.onSelect}
            />
            <div className={'mb-1 border-b border-line'} />
          </>
        )}
        {local.map(renderBranch)}
        {remote.length > 0 && <OptionGroupLabel>Remote</OptionGroupLabel>}
        {remote.map(renderBranch)}
        {filtered.length === 0 && <MutedHint>No branches</MutedHint>}
      </OptionList>
    </div>
  )
}
