import type { Meta, StoryObj } from '@storybook/react-vite'
import { LuChevronsUpDown } from 'react-icons/lu'
import { VscEye, VscEyeClosed } from 'react-icons/vsc'
import { Button } from '@/src/primitives/button.tsx'

const meta = {
  title: 'Primitives/Button',
  component: Button,
  decorators: [
    (Story) => {
      return (
        <div className={'bg-sidebar p-3'}>
          <Story />
        </div>
      )
    },
  ],
  args: {
    children: (
      <>
        <VscEye />
        Hide reviewed
      </>
    ),
  },
} satisfies Meta<typeof Button>

export default meta

type Story = StoryObj<typeof meta>

export const Surface: Story = {}

export const AccentSubtle: Story = {
  args: {
    variant: 'accent-subtle',
    children: (
      <>
        <VscEyeClosed />
        Show reviewed
      </>
    ),
  },
}

export const GhostIcon: Story = {
  args: {
    variant: 'ghost',
    icon: true,
    'aria-label': 'Expand all',
    children: <LuChevronsUpDown className={'size-4'} />,
  },
}

export const Disabled: Story = {
  args: { disabled: true },
}
