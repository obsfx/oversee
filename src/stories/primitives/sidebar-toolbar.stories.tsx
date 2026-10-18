import type { Meta, StoryObj } from '@storybook/react-vite'
import { LuChevronsDownUp } from 'react-icons/lu'
import { BareInput } from '@/src/primitives/bare-input.tsx'
import { FilterField } from '@/src/primitives/filter-field.tsx'
import { SidebarIconButton } from '@/src/primitives/sidebar-icon-button.tsx'
import { SidebarToolbar } from '@/src/primitives/sidebar-toolbar.tsx'

const meta = {
  title: 'Primitives/SidebarToolbar',
  component: SidebarToolbar,
  decorators: [
    (Story) => {
      return (
        <div className={'w-72 bg-sidebar text-xs'}>
          <Story />
        </div>
      )
    },
  ],
  args: {
    children: (
      <>
        <FilterField>
          <BareInput placeholder={'Filter files'} className={'text-xs'} />
        </FilterField>
        <SidebarIconButton aria-label={'Collapse all'}>
          <LuChevronsDownUp />
        </SidebarIconButton>
      </>
    ),
  },
} satisfies Meta<typeof SidebarToolbar>

export default meta

export const Default: StoryObj<typeof meta> = {}
