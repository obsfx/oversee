import { Combobox } from '@base-ui/react/combobox'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useRef } from 'react'
import { VirtualizedComboboxList } from '@/src/components/virtualized-combobox-list.tsx'
import type { ListVirtualizer } from '@/src/hooks/use-virtualized-combobox.ts'
import { GoogleFontCatalog } from '@/src/lib/google-font-catalog.ts'

const meta = {
  title: 'Components/VirtualizedComboboxList',
  component: VirtualizedComboboxList,
  args: { open: true, virtualizerRef: { current: null } },
  argTypes: { virtualizerRef: { table: { disable: true } } },
  render: function Render(args) {
    const virtualizerRef = useRef<ListVirtualizer | null>(null)
    return (
      <Combobox.Root
        items={GoogleFontCatalog.uiFamilies}
        virtualized
        inline
        defaultValue={'Google Sans Flex'}
      >
        <Combobox.List className={'w-56 rounded-md border border-line'}>
          <VirtualizedComboboxList open={args.open} virtualizerRef={virtualizerRef} />
        </Combobox.List>
      </Combobox.Root>
    )
  },
} satisfies Meta<typeof VirtualizedComboboxList>

export default meta

export const AllGoogleFonts: StoryObj<typeof meta> = {}
