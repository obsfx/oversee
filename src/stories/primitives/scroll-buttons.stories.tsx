import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { ScrollButtons } from '@/src/primitives/scroll-buttons.tsx'

const meta = {
  title: 'Primitives/ScrollButtons',
  component: ScrollButtons,
  args: {
    previousLabel: 'Scroll tabs left',
    nextLabel: 'Scroll tabs right',
    canPrevious: true,
    canNext: true,
    onPrevious: fn(),
    onNext: fn(),
  },
  decorators: [
    (Story) => {
      return (
        <div className={'flex items-center gap-0.5 text-xs text-fg'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof ScrollButtons>

export default meta

type Story = StoryObj<typeof meta>

export const BothWays: Story = {}

export const AtStart: Story = { args: { canPrevious: false } }

export const AtEnd: Story = { args: { canNext: false } }
