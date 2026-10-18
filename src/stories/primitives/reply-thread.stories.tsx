import type { Meta, StoryObj } from '@storybook/react-vite'
import { ReplyEntry } from '@/src/primitives/reply-entry.tsx'
import { ReplyThread } from '@/src/primitives/reply-thread.tsx'

const meta = {
  title: 'Primitives/ReplyThread',
  component: ReplyThread,
  args: {
    children: (
      <>
        <ReplyEntry
          author={'agent'}
          age={'1h ago'}
          body={'Kept as is, it is validated in the loader.'}
        />
        <ReplyEntry
          author={'agent'}
          age={'just now'}
          body={'Added a unit comment to the template.'}
        />
      </>
    ),
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
} satisfies Meta<typeof ReplyThread>

export default meta

export const Default: StoryObj<typeof meta> = {}
