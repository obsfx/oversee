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

export const Default: StoryObj<typeof meta> = {}
