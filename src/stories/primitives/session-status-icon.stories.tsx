import type { Meta, StoryObj } from '@storybook/react-vite'
import { TooltipProvider } from '@/src/context/tooltip/tooltip-provider.tsx'
import { SessionStatusIcon } from '@/src/primitives/session-status-icon.tsx'

const meta = {
  title: 'Primitives/SessionStatusIcon',
  component: SessionStatusIcon,
  args: { status: 'created' },
  argTypes: { status: { control: 'inline-radio', options: ['created', 'in-progress', 'closed'] } },
  decorators: [
    (Story) => {
      return (
        <TooltipProvider>
          <div className={'p-8'}>
            <Story />
          </div>
        </TooltipProvider>
      )
    },
  ],
} satisfies Meta<typeof SessionStatusIcon>

export default meta

type Story = StoryObj<typeof meta>

export const Created: Story = {}

export const InProgress: Story = { args: { status: 'in-progress' } }

export const Closed: Story = { args: { status: 'closed' } }
