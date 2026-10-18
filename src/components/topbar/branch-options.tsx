import { VscEdit, VscGitBranch } from 'react-icons/vsc'
import { useOptionFilter } from '../../hooks/use-option-filter.ts'
import { BareInput } from '../../primitives/bare-input.tsx'
import { MutedHint } from '../../primitives/muted-hint.tsx'
import { OptionList } from '../../primitives/option-list.tsx'
import { OptionRow } from '../../primitives/option-row.tsx'
import { SearchField } from '../../primitives/search-field.tsx'

interface PinnedOption {
  label: string
  selected: boolean
  onSelect: () => void
}

interface BranchOptionsProps {
  placeholder: string
  branches: string[]
  selected: string | null
  onSelect: (branch: string) => void
  pinned?: PinnedOption
}

export function BranchOptions({
  placeholder,
  branches,
  selected,
  onSelect,
  pinned,
}: BranchOptionsProps) {
  const { query, setQuery, filtered, isFiltering } = useOptionFilter(branches)
  const showPinned = pinned && !isFiltering

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
        {filtered.map((branch) => {
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
        })}
        {filtered.length === 0 && <MutedHint>No branches</MutedHint>}
      </OptionList>
    </div>
  )
}
