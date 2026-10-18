import type { Meta, StoryObj } from '@storybook/react-vite'
import { SessionSnippet } from '@/src/components/topbar/session-snippet.tsx'
import { createStoryServices } from '@/src/stories/support/fixtures.ts'
import { reviewSessions } from '@/src/stories/support/review-session-fixture.ts'
import { StoryFrame } from '@/src/stories/support/story-frame.tsx'

const services = createStoryServices()
const [yamlComment, tsComment] = reviewSessions[0].comments

const meta = {
  title: 'Components/Topbar/SessionSnippet',
  component: SessionSnippet,
  args: { lines: tsComment.lines, filePath: tsComment.filePath },
  decorators: [
    (Story) => {
      return (
        <StoryFrame services={services}>
          <div className={'w-96'}>
            <Story />
          </div>
        </StoryFrame>
      )
    },
  ],
} satisfies Meta<typeof SessionSnippet>

export default meta

type Story = StoryObj<typeof meta>

export const TypeScript: Story = {}

export const Yaml: Story = { args: { lines: yamlComment.lines, filePath: yamlComment.filePath } }
