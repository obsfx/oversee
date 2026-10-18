import { Tabs } from '@base-ui/react/tabs'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { PopoverTab } from '@/src/primitives/popover-tab.tsx'
import { PopoverTabsHeader } from '@/src/primitives/popover-tabs-header.tsx'

const meta = {
  title: 'Primitives/PopoverTabsHeader',
  component: PopoverTabsHeader,
  args: {
    meta: '4 comments',
    children: (
      <>
        <PopoverTab value={'current'} label={'Current'} count={4} />
        <PopoverTab value={'sessions'} label={'Sessions'} count={3} />
      </>
    ),
  },
  decorators: [
    (Story) => {
      return (
        <Tabs.Root defaultValue={'current'}>
          <div className={'w-[26rem] border border-line text-xs'}>
            <Story />
          </div>
        </Tabs.Root>
      )
    },
  ],
} satisfies Meta<typeof PopoverTabsHeader>

export default meta

export const Default: StoryObj<typeof meta> = {}
