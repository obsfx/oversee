import type { Meta, StoryObj } from '@storybook/react-vite'
import { ProgressBar } from '@/src/primitives/progress-bar.tsx'

const meta = {
  title: 'Primitives/ProgressBar',
  component: ProgressBar,
  args: { label: 'Installing gopls', ratio: 0.42, className: 'rounded-full' },
  decorators: [
    (Story) => {
      return (
        <div className={'w-72'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof ProgressBar>

export default meta

type Story = StoryObj<typeof meta>

export const Determinate: Story = {}

export const Indeterminate: Story = { args: { ratio: null } }

export const Complete: Story = { args: { ratio: 1 } }
