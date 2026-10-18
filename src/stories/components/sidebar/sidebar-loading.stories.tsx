import type { Meta, StoryObj } from '@storybook/react-vite'
import { SidebarLoading } from '@/src/components/sidebar/sidebar-loading.tsx'

const meta = {
  title: 'Components/Sidebar/SidebarLoading',
  component: SidebarLoading,
  decorators: [
    (Story) => {
      return (
        <div className={'h-64 w-72 bg-sidebar text-xs'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof SidebarLoading>

export default meta

export const Default: StoryObj<typeof meta> = {}
