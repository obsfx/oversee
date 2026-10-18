import type { Meta, StoryObj } from '@storybook/react-vite'
import { MdKeyboardCommandKey } from 'react-icons/md'
import { Kbd } from '@/src/primitives/kbd.tsx'

const meta = {
  title: 'Primitives/Kbd',
  component: Kbd,
  args: { children: 'Esc' },
} satisfies Meta<typeof Kbd>

export default meta

type Story = StoryObj<typeof meta>

export const Text: Story = {}

export const Icon: Story = { args: { children: <MdKeyboardCommandKey aria-hidden /> } }
