import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { SidebarModeIcon } from '@/src/primitives/sidebar-mode-icon.tsx'
import { SidebarTitleButton } from '@/src/primitives/sidebar-title-button.tsx'

const meta = {
  title: 'Primitives/SidebarTitleButton',
  component: SidebarTitleButton,
  args: {
    icon: <SidebarModeIcon mode={'files'} />,
    children: 'Files',
    onClick: fn(),
  },
  decorators: [
    (Story) => {
      return (
        <div className={'flex w-72 bg-sidebar p-1 text-xs'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof SidebarTitleButton>

export default meta

type Story = StoryObj<typeof meta>

export const Files: Story = {}

export const Flow: Story = { args: { icon: <SidebarModeIcon mode={'flow'} />, children: 'Flow' } }
