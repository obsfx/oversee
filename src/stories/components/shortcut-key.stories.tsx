import type { Meta, StoryObj } from '@storybook/react-vite'
import { ShortcutKey } from '@/src/components/shortcut-key.tsx'

const meta = {
  title: 'Components/ShortcutKey',
  component: ShortcutKey,
  args: { name: 'mod' },
  argTypes: { name: { control: 'inline-radio', options: ['mod', 'enter', 'escape'] } },
} satisfies Meta<typeof ShortcutKey>

export default meta

type Story = StoryObj<typeof meta>

export const Mod: Story = {}

export const Enter: Story = { args: { name: 'enter' } }

export const Escape: Story = { args: { name: 'escape' } }
