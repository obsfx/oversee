import type { Meta, StoryObj } from '@storybook/react-vite'
import { SidebarEmpty } from '@/src/components/sidebar/sidebar-empty.tsx'

const meta = {
  title: 'Components/Sidebar/SidebarEmpty',
  component: SidebarEmpty,
  decorators: [
    (Story) => {
      return (
        <div className={'h-64 w-72 bg-sidebar text-xs'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof SidebarEmpty>

export default meta

export const Default: StoryObj<typeof meta> = {}
