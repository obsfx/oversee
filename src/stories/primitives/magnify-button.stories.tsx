import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { CommentLocation } from '@/src/primitives/comment-location.tsx'
import { MagnifyButton } from '@/src/primitives/magnify-button.tsx'
import { OutdatedLabel } from '@/src/primitives/outdated-label.tsx'

const meta = {
  title: 'Primitives/MagnifyButton',
  component: MagnifyButton,
  args: { label: 'Read this thread', onClick: fn() },
  decorators: [
    (Story) => {
      return (
        <div className={'w-96'}>
          <CommentLocation filePath={'scripts/expire_password.ts'} location={'L6-9'}>
            <Story />
          </CommentLocation>
        </div>
      )
    },
  ],
} satisfies Meta<typeof MagnifyButton>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const AfterMarker: Story = {
  decorators: [
    (Story) => {
      return (
        <>
          <OutdatedLabel />
          <Story />
        </>
      )
    },
  ],
}
