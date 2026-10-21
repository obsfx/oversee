import { Popover } from '@base-ui/react/popover'
import { VscChevronDown, VscSearch } from 'react-icons/vsc'
import { type OpenFile, useOpenFilesList } from '@/src/hooks/use-open-files-list.ts'
import { BareInput } from '@/src/primitives/bare-input.tsx'
import { IconButton } from '@/src/primitives/icon-button.tsx'
import { OpenFileRow } from '@/src/primitives/open-file-row.tsx'
import { PopoverEmptyState } from '@/src/primitives/popover-empty-state.tsx'
import { PopoverScrollArea } from '@/src/primitives/popover-scroll-area.tsx'
import { PopoverSurface } from '@/src/primitives/popover-surface.tsx'
import { SearchField } from '@/src/primitives/search-field.tsx'
import { Tooltip } from '@/src/primitives/tooltip.tsx'

export function OpenFilesPopover({ files }: { files: OpenFile[] }) {
  const list = useOpenFilesList(files)

  return (
    <Popover.Root onOpenChange={list.onOpenChange}>
      <Tooltip label={'All open files'}>
        <Popover.Trigger render={<IconButton />} aria-label={'All open files'}>
          <VscChevronDown />
        </Popover.Trigger>
      </Tooltip>
      <PopoverSurface align={'end'} className={'w-80'}>
        {list.filterable && (
          <SearchField>
            <BareInput
              autoFocus
              value={list.query}
              placeholder={'Filter open files'}
              aria-label={'Filter open files'}
              onChange={(event) => {
                list.setQuery(event.target.value)
              }}
            />
          </SearchField>
        )}
        <PopoverScrollArea>
          {list.files.map((file) => {
            return (
              <Popover.Close
                key={file.id}
                render={
                  <OpenFileRow
                    name={file.name}
                    directory={file.directory}
                    path={file.path}
                    current={file.active}
                  />
                }
                onClick={file.select}
              />
            )
          })}
          {list.files.length === 0 && (
            <PopoverEmptyState icon={<VscSearch />}>No open file matches</PopoverEmptyState>
          )}
        </PopoverScrollArea>
      </PopoverSurface>
    </Popover.Root>
  )
}
