import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { SidebarFailed } from '../../../components/sidebar/sidebar-failed.tsx'

const meta = {
  title: 'Components/Sidebar/SidebarFailed',
  component: SidebarFailed,
  args: { reason: 'get-file-tree: request failed', onRetry: fn() },
  decorators: [
    (Story) => {
      return (
        <div className={'h-64 w-72 bg-sidebar text-xs'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof SidebarFailed>

export default meta

export const Default: StoryObj<typeof meta> = {}
