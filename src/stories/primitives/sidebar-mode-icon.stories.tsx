import type { Meta, StoryObj } from '@storybook/react-vite'
import { SidebarModeIcon } from '@/src/primitives/sidebar-mode-icon.tsx'

const meta = {
  title: 'Primitives/SidebarModeIcon',
  component: SidebarModeIcon,
  args: { mode: 'files' },
  argTypes: { mode: { control: 'inline-radio', options: ['files', 'flow'] } },
  decorators: [
    (Story) => {
      return (
        <div className={'inline-flex bg-sidebar p-2 text-xs text-sidebar-fg'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof SidebarModeIcon>

export default meta

type Story = StoryObj<typeof meta>

export const Files: Story = {}

export const Flow: Story = { args: { mode: 'flow' } }
