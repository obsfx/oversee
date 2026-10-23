import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { SidebarModeMenu } from '@/src/components/sidebar/sidebar-mode-menu.tsx'
import { SidebarHeader } from '@/src/primitives/sidebar-header.tsx'

const meta = {
  title: 'Components/Sidebar/SidebarModeMenu',
  component: SidebarModeMenu,
  args: { mode: 'files', onChange: fn() },
  decorators: [
    (Story) => {
      return (
        <div className={'w-72 bg-sidebar text-xs'}>
          <SidebarHeader>
            <Story />
          </SidebarHeader>
        </div>
      )
    },
  ],
} satisfies Meta<typeof SidebarModeMenu>

export default meta

type Story = StoryObj<typeof meta>

export const Files: Story = {}

export const Flow: Story = { args: { mode: 'flow' } }
