import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { SummaryRow } from '@/src/primitives/summary-row.tsx'

const meta = {
  title: 'Primitives/SummaryRow',
  component: SummaryRow,
  args: { label: 'Interface', summary: 'Google Sans Flex, 400, 12px', onOpen: fn() },
  decorators: [
    (Story) => {
      return (
        <div className={'w-72'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof SummaryRow>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const LongSummary: Story = {
  args: { label: 'Editor', summary: 'IBM Plex Mono, 500, 14px, 1.8' },
}
