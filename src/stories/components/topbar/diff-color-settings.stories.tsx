import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { DiffColorSettings } from '@/src/components/topbar/diff-color-settings.tsx'
import { createStoryServices } from '@/src/stories/support/fixtures.ts'
import { StoryFrame } from '@/src/stories/support/story-frame.tsx'

const services = createStoryServices()

const meta = {
  title: 'Components/Topbar/DiffColorSettings',
  component: DiffColorSettings,
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
} satisfies Meta<typeof DiffColorSettings>

export default meta

export const Default: StoryObj<typeof meta> = {}
