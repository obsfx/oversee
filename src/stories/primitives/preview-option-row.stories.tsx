import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { PreviewOptionRow } from '@/src/primitives/preview-option-row.tsx'

const meta = {
  title: 'Primitives/PreviewOptionRow',
  component: PreviewOptionRow,
  args: { label: 'GitHub Dark', selected: false, onSelect: fn(), onPreview: fn() },
  decorators: [
    (Story) => {
      return (
        <div className={'w-72 text-xs'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof PreviewOptionRow>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Selected: Story = { args: { selected: true } }
