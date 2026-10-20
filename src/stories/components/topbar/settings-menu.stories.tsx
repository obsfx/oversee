import type { Meta, StoryObj } from '@storybook/react-vite'
import { SettingsMenu } from '@/src/components/topbar/settings-menu.tsx'
import { createLiveStoryServices } from '@/src/stories/support/fixtures.ts'
import { StoryFrame } from '@/src/stories/support/story-frame.tsx'

const services = createLiveStoryServices()

const meta = {
  title: 'Components/Topbar/SettingsMenu',
  component: SettingsMenu,
  decorators: [
    (Story) => {
      return (
        <StoryFrame services={services}>
          <div className={'flex justify-end'}>
            <Story />
          </div>
        </StoryFrame>
      )
    },
  ],
} satisfies Meta<typeof SettingsMenu>

export default meta

export const Default: StoryObj<typeof meta> = {}
