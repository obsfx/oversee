import { Dialog } from '@base-ui/react/dialog'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { CommentLocation } from '@/src/primitives/comment-location.tsx'
import { DialogSurface } from '@/src/primitives/dialog-surface.tsx'
import { PagerControl } from '@/src/primitives/pager-control.tsx'

const PARAGRAPHS = Array.from({ length: 24 }, (_, index) => {
  return `Paragraph ${index + 1}. The reader body scrolls on its own while the header with the location, the pager and the close button stays in place.`
})

const meta = {
  title: 'Primitives/DialogSurface',
  component: DialogSurface,
  args: {
    title: (
      <CommentLocation
        size={'reader'}
        filePath={'src/graphql/resolvers/User/mutations/auth.ts'}
        location={'L22-26'}
        onOpen={fn()}
      />
    ),
    children: <p className={'text-[0.9375rem]'}>A short body.</p>,
  },
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => {
      return (
        <Dialog.Root open>
          <Story />
        </Dialog.Root>
      )
    },
  ],
} satisfies Meta<typeof DialogSurface>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithActions: Story = {
  args: {
    actions: (
      <PagerControl
        position={2}
        count={4}
        previousLabel={'Previous comment'}
        nextLabel={'Next comment'}
        onPrevious={fn()}
        onNext={fn()}
      />
    ),
  },
}

export const LongBody: Story = {
  args: {
    children: (
      <div className={'flex flex-col gap-3 text-[0.9375rem]'}>
        {PARAGRAPHS.map((paragraph) => {
          return <p key={paragraph}>{paragraph}</p>
        })}
      </div>
    ),
  },
}

export const LongTitle: Story = {
  args: {
    title: (
      <CommentLocation
        size={'reader'}
        filePath={
          'src/graphql/resolvers/AdminUser/mutations/very/deeply/nested/folder/with/more/levels/deleteMany.ts'
        }
        location={'L1204-1288'}
        onOpen={fn()}
      />
    ),
  },
}
