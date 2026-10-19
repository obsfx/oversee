import type { Meta, StoryObj } from '@storybook/react-vite'
import { CommentLocation } from '@/src/primitives/comment-location.tsx'
import { OutdatedLabel } from '@/src/primitives/outdated-label.tsx'

const meta = {
  title: 'Primitives/CommentLocation',
  component: CommentLocation,
  args: {
    filePath: 'src/graphql/resolvers/User/mutations/auth.ts',
    location: 'L53-56',
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
} satisfies Meta<typeof CommentLocation>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithMarker: Story = { args: { children: <OutdatedLabel /> } }

export const LongPath: Story = {
  args: {
    filePath: 'src/graphql/resolvers/AdminUser/mutations/very/deeply/nested/folder/deleteMany.ts',
  },
}
