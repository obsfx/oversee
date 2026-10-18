import type { Meta, StoryObj } from '@storybook/react-vite'
import { ShortcutHint } from '@/src/components/shortcut-hint.tsx'

const meta = {
  title: 'Components/ShortcutHint',
  component: ShortcutHint,
  args: { keys: ['mod', 'enter'], label: 'to send' },
  decorators: [
    (Story) => {
      return (
        <span className={'text-micro text-fg-faint'}>
          <Story />
        </span>
      )
    },
  ],
} satisfies Meta<typeof ShortcutHint>

export default meta

type Story = StoryObj<typeof meta>

export const Combination: Story = {}

export const SingleKey: Story = { args: { keys: ['escape'], label: 'to cancel' } }
