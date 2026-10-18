import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { InterfaceSettings } from '../../../components/topbar/interface-settings.tsx'
import { createStoryServices } from '../../support/fixtures.ts'
import { StoryFrame } from '../../support/story-frame.tsx'

const services = createStoryServices()

const meta = {
  title: 'Components/Topbar/InterfaceSettings',
  component: InterfaceSettings,
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
} satisfies Meta<typeof InterfaceSettings>

export default meta

export const Default: StoryObj<typeof meta> = {}
