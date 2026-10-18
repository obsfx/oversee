import type { Meta, StoryObj } from '@storybook/react-vite'
import { SettingsMenu } from '../../../components/topbar/settings-menu.tsx'
import { createStoryServices } from '../../support/fixtures.ts'
import { StoryFrame } from '../../support/story-frame.tsx'

const services = createStoryServices()

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
