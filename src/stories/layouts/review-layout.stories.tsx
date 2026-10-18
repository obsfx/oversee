import type { Meta, StoryObj } from '@storybook/react-vite'
import { ReviewLayout } from '../../layouts/review-layout.tsx'
import { createStoryServices } from '../support/fixtures.ts'
import { StoryFrame } from '../support/story-frame.tsx'

const services = createStoryServices()

const meta = {
  title: 'Layouts/ReviewLayout',
  component: ReviewLayout,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => {
      return (
        <StoryFrame services={services}>
          <div className={'-m-3'}>
            <Story />
          </div>
        </StoryFrame>
      )
    },
  ],
} satisfies Meta<typeof ReviewLayout>

export default meta

export const Default: StoryObj<typeof meta> = {}
