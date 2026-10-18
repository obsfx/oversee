import { Tabs } from '@base-ui/react/tabs'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { PopoverTab } from '@/src/primitives/popover-tab.tsx'

const meta = {
  title: 'Primitives/PopoverTab',
  component: PopoverTab,
  args: { value: 'current', label: 'Current', count: 4 },
  decorators: [
    (Story) => {
      return (
        <Tabs.Root defaultValue={'current'}>
          <Tabs.List className={'flex gap-0.5 text-xs'}>
            <Story />
            <PopoverTab value={'sessions'} label={'Sessions'} count={3} />
          </Tabs.List>
        </Tabs.Root>
      )
    },
  ],
} satisfies Meta<typeof PopoverTab>

export default meta

export const Default: StoryObj<typeof meta> = {}
