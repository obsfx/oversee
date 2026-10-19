import type { Meta, StoryObj } from '@storybook/react-vite'
import { DiffViewer } from '@/src/components/diff-viewer/diff-viewer.tsx'
import type { Services } from '@/src/lib/services.ts'
import { LARGE_FILE_PATH } from '@/src/stories/support/file-diff-fixture.ts'
import { createStoryServices, neverResolves, rejectsWith } from '@/src/stories/support/fixtures.ts'
import { StoryFrame } from '@/src/stories/support/story-frame.tsx'
import { resetReviewState, STORY_PATH } from '@/src/stories/support/story-review-state.ts'

const meta = {
  title: 'Components/DiffViewer/DiffViewer',
  component: DiffViewer,
  parameters: { layout: 'fullscreen' },
  args: { services: createStoryServices(), path: STORY_PATH },
  argTypes: { services: { table: { disable: true } } },
  beforeEach: ({ args }) => {
    resetReviewState(args.path)
  },
  render: ({ services }) => {
    return (
      <StoryFrame services={services}>
        <div className={'-m-3 h-screen'}>
          <DiffViewer />
        </div>
      </StoryFrame>
    )
  },
} satisfies Meta<{ services: Services; path: string | null }>

export default meta

type Story = StoryObj<typeof meta>

export const WithComments: Story = {}

export const WithoutComments: Story = { args: { services: createStoryServices({ comments: [] }) } }

export const LargeFile: Story = { args: { path: LARGE_FILE_PATH } }

export const AddedFile: Story = { args: { path: '.env.template' } }

export const ImageFile: Story = { args: { path: 'src/assets/emptyPhotoPlaceholder.png' } }

export const OtherBinaryFile: Story = { args: { path: 'src/assets/emptyVideoPlaceholder.mp4' } }

export const NoChanges: Story = {
  args: {
    services: createStoryServices({
      changeSets: () => {
        return Promise.resolve({ changes: [] })
      },
    }),
    path: null,
  },
}

export const NoContentChanges: Story = {
  args: {
    services: createStoryServices({
      fileDiffs: ({ change }) => {
        const file = { name: change.path, contents: 'export const ttl = 30\n' }
        return Promise.resolve({
          binary: false,
          images: null,
          oldFile: { ...file, cacheKey: 'story::same::old' },
          newFile: { ...file, cacheKey: 'story::same::new' },
        })
      },
    }),
  },
}

export const Loading: Story = {
  args: { services: createStoryServices({ fileDiffs: neverResolves }) },
}

export const Failed: Story = {
  args: {
    services: createStoryServices({ fileDiffs: rejectsWith('get-file-diff: request failed') }),
  },
}
