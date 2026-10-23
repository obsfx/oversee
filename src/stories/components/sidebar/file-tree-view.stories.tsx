import type { Meta, StoryObj } from '@storybook/react-vite'
import { createStoryServices } from '@/src/stories/support/fixtures.ts'
import { changeSet } from '@/src/stories/support/change-set-fixture.ts'
import { StoryFileTree } from '@/src/stories/support/story-file-tree.tsx'
import { StoryFrame } from '@/src/stories/support/story-frame.tsx'
import { seedReviewedMarks } from '@/src/stories/support/story-review-state.ts'
import { useNavigationStore } from '@/src/store/navigation-store.ts'

const services = createStoryServices()

const meta = {
  title: 'Components/Sidebar/FileTreeView',
  component: StoryFileTree,
  args: { changes: changeSet.changes },
  argTypes: { changes: { table: { disable: true } } },
  beforeEach: () => {
    seedReviewedMarks()
  },
  decorators: [
    (Story) => {
      return (
        <StoryFrame services={services}>
          <div className={'h-[32rem] w-72 bg-sidebar'}>
            <Story />
          </div>
        </StoryFrame>
      )
    },
  ],
} satisfies Meta<typeof StoryFileTree>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Selected: Story = {
  beforeEach: () => {
    useNavigationStore.setState({
      selectedPath: 'src/graphql/resolvers/User/mutations/auth.ts',
      reveal: null,
      focus: null,
    })
  },
}

export const WithReviewed: Story = {
  beforeEach: () => {
    seedReviewedMarks([
      '.env.template',
      '.gitignore',
      'scripts/alpha_user_subscribe.ts',
      'scripts/expire_password.ts',
    ])
  },
}
