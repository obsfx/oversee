import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { ExpandAllButton } from '@/src/components/sidebar/expand-all-button.tsx'
import { TooltipProvider } from '@/src/context/tooltip/tooltip-provider.tsx'

const meta = {
  title: 'Components/Sidebar/ExpandAllButton',
  component: ExpandAllButton,
  args: { expanded: true, onToggle: fn() },
  decorators: [
    (Story) => {
      return (
        <TooltipProvider>
          <div className={'bg-sidebar p-3'}>
            <Story />
          </div>
        </TooltipProvider>
      )
    },
  ],
} satisfies Meta<typeof ExpandAllButton>

export default meta

type Story = StoryObj<typeof meta>

export const Expanded: Story = {}

export const Collapsed: Story = { args: { expanded: false } }

export const Disabled: Story = { args: { disabled: true } }
