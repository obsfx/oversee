import type { Meta, StoryObj } from '@storybook/react-vite'
import { ReplyEntry } from '@/src/primitives/reply-entry.tsx'

const meta = {
  title: 'Primitives/ReplyEntry',
  component: ReplyEntry,
  args: {
    author: 'agent',
    age: '20m ago',
    body: 'The script runs once per deploy, so the extra query is not on a hot path.',
  },
  decorators: [
    (Story) => {
      return (
        <div className={'w-96 text-xs'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof ReplyEntry>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const RichBody: Story = {
  args: {
    body: (
      <div className={'flex flex-col gap-1'}>
        <p>The script runs once per deploy.</p>
        <p>Keeping it as is, the extra query is not on a hot path.</p>
      </div>
    ),
  },
}
