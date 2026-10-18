import type { FileTree } from '@pierre/trees'
import { VscClose } from 'react-icons/vsc'
import { useTreeFilter } from '../../hooks/use-tree-filter.ts'
import { BareInput } from '../../primitives/bare-input.tsx'
import { FilterField } from '../../primitives/filter-field.tsx'

export function TreeFilter({ model }: { model: FileTree }) {
  const { value, apply, clear } = useTreeFilter(model)

  return (
    <FilterField>
      <BareInput
        value={value}
        placeholder={'Filter files'}
        aria-label={'Filter files'}
        className={'text-xs'}
        onChange={(event) => {
          apply(event.target.value)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            clear()
          }
        }}
      />
      {value !== '' && (
        <button
          type={'button'}
          aria-label={'Clear filter'}
          className={'cursor-pointer text-sidebar-muted hover:text-sidebar-fg'}
          onClick={clear}
        >
          <VscClose />
        </button>
      )}
    </FilterField>
  )
}
