import type { Meta, StoryObj } from '@storybook/react-vite'
import { SidebarShell } from '../../primitives/sidebar-shell.tsx'

const meta = {
  title: 'Primitives/SidebarShell',
  component: SidebarShell,
  decorators: [
    (Story) => {
      return (
        <div className={'h-64 w-64'}>
          <Story />
        </div>
      )
    },
  ],
  args: { children: <div className={'p-2'}>Sidebar content</div> },
} satisfies Meta<typeof SidebarShell>

export default meta

export const Default: StoryObj<typeof meta> = {}
