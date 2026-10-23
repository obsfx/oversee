import type { Meta, StoryObj } from '@storybook/react-vite'
import { ProgressLine } from '@/src/primitives/progress-line.tsx'

const meta = {
  title: 'Primitives/ProgressLine',
  component: ProgressLine,
  args: {
    label: 'Call flow progress',
    ratio: 0.46,
    phase: 'Tracing calls in TypeScript, 412 of 1069 functions, 1 of 3 servers ready',
  },
  decorators: [
    (Story) => {
      return (
        <div className={'w-72 bg-sidebar text-xs text-sidebar-fg'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof ProgressLine>

export default meta

type Story = StoryObj<typeof meta>

export const Tracing: Story = {}

export const Reading: Story = {
  args: { ratio: 0.12, phase: 'Reading symbols in Go and TypeScript, 40 of 160 files' },
}

export const Starting: Story = {
  args: { ratio: 0, phase: 'Starting gopls, 1 of 3 servers ready' },
}

export const ReadingChanges: Story = { args: { ratio: null, phase: 'Reading the changes' } }

export const NoSignal: Story = { args: { ratio: null, phase: 'Tracing the changed functions' } }
