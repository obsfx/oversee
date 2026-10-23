import type { Meta, StoryObj } from '@storybook/react-vite'
import { SidebarHeader } from '@/src/primitives/sidebar-header.tsx'
import { SidebarModeIcon } from '@/src/primitives/sidebar-mode-icon.tsx'
import { SidebarTitleButton } from '@/src/primitives/sidebar-title-button.tsx'

const meta = {
  title: 'Primitives/SidebarHeader',
  component: SidebarHeader,
  decorators: [
    (Story) => {
      return (
        <div className={'w-72 bg-sidebar text-xs'}>
          <Story />
        </div>
      )
    },
  ],
  args: {
    children: (
      <SidebarTitleButton icon={<SidebarModeIcon mode={'files'} />}>Files</SidebarTitleButton>
    ),
  },
} satisfies Meta<typeof SidebarHeader>

export default meta

export const Default: StoryObj<typeof meta> = {}
