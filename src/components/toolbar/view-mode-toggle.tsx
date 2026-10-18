import { LuColumns2, LuRows2 } from 'react-icons/lu'
import { Tooltip } from '@/src/primitives/tooltip.tsx'
import { SegmentedControl } from '@/src/primitives/segmented-control.tsx'
import { SegmentedOption } from '@/src/primitives/segmented-option.tsx'
import { type DiffViewMode, useDiffViewStore } from '@/src/store/diff-view-store.ts'

const MODES: { value: DiffViewMode; label: string; Icon: typeof LuColumns2 }[] = [
  { value: 'split', label: 'Split view', Icon: LuColumns2 },
  { value: 'unified', label: 'Unified view', Icon: LuRows2 },
]

export function ViewModeToggle() {
  const viewMode = useDiffViewStore((diffView) => {
    return diffView.viewMode
  })
  const setViewMode = useDiffViewStore((diffView) => {
    return diffView.setViewMode
  })

  return (
    <SegmentedControl>
      {MODES.map(({ value, label, Icon }) => {
        return (
          <Tooltip key={value} label={label}>
            <SegmentedOption
              active={value === viewMode}
              aria-label={label}
              className={'flex h-5 items-center'}
              onClick={() => {
                setViewMode(value)
              }}
            >
              <Icon />
            </SegmentedOption>
          </Tooltip>
        )
      })}
    </SegmentedControl>
  )
}
