import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { SettingsOverview } from '../../../components/topbar/settings-overview.tsx'
import { createStoryServices } from '../../support/fixtures.ts'
import { StoryFrame } from '../../support/story-frame.tsx'

const services = createStoryServices()

const meta = {
  title: 'Components/Topbar/SettingsOverview',
  component: SettingsOverview,
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
} satisfies Meta<typeof SettingsOverview>

export default meta

export const Default: StoryObj<typeof meta> = {}
