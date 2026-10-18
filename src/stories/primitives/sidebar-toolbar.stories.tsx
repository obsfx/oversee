import type { Meta, StoryObj } from '@storybook/react-vite'
import { LuChevronsDownUp } from 'react-icons/lu'
import { BareInput } from '../../primitives/bare-input.tsx'
import { Button } from '../../primitives/button.tsx'
import { FilterField } from '../../primitives/filter-field.tsx'
import { SidebarToolbar } from '../../primitives/sidebar-toolbar.tsx'

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
        <Button variant={'ghost'} icon aria-label={'Collapse all'}>
          <LuChevronsDownUp className={'size-4'} />
        </Button>
      </>
    ),
  },
} satisfies Meta<typeof SidebarToolbar>

export default meta

export const Default: StoryObj<typeof meta> = {}
