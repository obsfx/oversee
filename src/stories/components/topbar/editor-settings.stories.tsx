import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { EditorSettings } from '@/src/components/topbar/editor-settings.tsx'
import { createStoryServices } from '@/src/stories/support/fixtures.ts'
import { StoryFrame } from '@/src/stories/support/story-frame.tsx'

const services = createStoryServices()

const meta = {
  title: 'Components/Topbar/EditorSettings',
  component: EditorSettings,
  args: { navigate: fn() },
  decorators: [
    (Story) => {
      return (
        <StoryFrame services={services}>
          <div className={'flex w-72 flex-col gap-2'}>
            <Story />
          </div>
        </StoryFrame>
      )
    },
  ],
} satisfies Meta<typeof EditorSettings>

export default meta

export const Default: StoryObj<typeof meta> = {}
