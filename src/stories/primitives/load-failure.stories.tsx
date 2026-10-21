import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { LoadFailure } from '@/src/primitives/load-failure.tsx'

const meta = {
  title: 'Primitives/LoadFailure',
  component: LoadFailure,
  args: { message: 'Could not load this diff', onRetry: fn() },
  decorators: [
    (Story) => {
      return (
        <div className={'h-48 text-xs text-fg'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof LoadFailure>

export default meta

type Story = StoryObj<typeof meta>

export const Diff: Story = {}

export const File: Story = { args: { message: 'Could not read this file' } }
