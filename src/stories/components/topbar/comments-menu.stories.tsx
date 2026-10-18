import type { Meta, StoryObj } from '@storybook/react-vite'
import { CommentsMenu } from '@/src/components/topbar/comments-menu.tsx'
import type { Services } from '@/src/lib/services.ts'
import { createStoryServices } from '@/src/stories/support/fixtures.ts'
import { StoryFrame } from '@/src/stories/support/story-frame.tsx'

const meta = {
  title: 'Components/Topbar/CommentsMenu',
  component: CommentsMenu,
  args: { services: createStoryServices() },
  argTypes: { services: { table: { disable: true } } },
  render: ({ services }) => {
    return (
      <StoryFrame services={services}>
        <div className={'flex justify-end'}>
          <CommentsMenu />
        </div>
      </StoryFrame>
    )
  },
} satisfies Meta<{ services: Services }>

export default meta

type Story = StoryObj<typeof meta>

export const WithComments: Story = {}

export const Empty: Story = { args: { services: createStoryServices({ comments: [] }) } }
