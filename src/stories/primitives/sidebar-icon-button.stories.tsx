import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { VscEye, VscEyeClosed } from 'react-icons/vsc'
import { SidebarIconButton } from '@/src/primitives/sidebar-icon-button.tsx'

const meta = {
  title: 'Primitives/SidebarIconButton',
  component: SidebarIconButton,
  args: { 'aria-label': 'Hide reviewed files', onClick: fn(), children: <VscEye /> },
  decorators: [
    (Story) => {
      return (
        <div className={'bg-sidebar p-3'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof SidebarIconButton>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Pressed: Story = {
  args: { 'aria-label': 'Show reviewed files', 'aria-pressed': true, children: <VscEyeClosed /> },
}

export const Disabled: Story = { args: { disabled: true } }
