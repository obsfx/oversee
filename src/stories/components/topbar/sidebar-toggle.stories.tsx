import type { Meta, StoryObj } from '@storybook/react-vite'
import { SidebarToggle } from '@/src/components/topbar/sidebar-toggle.tsx'

const meta = {
  title: 'Components/Topbar/SidebarToggle',
  component: SidebarToggle,
} satisfies Meta<typeof SidebarToggle>

export default meta

export const Default: StoryObj<typeof meta> = {}
