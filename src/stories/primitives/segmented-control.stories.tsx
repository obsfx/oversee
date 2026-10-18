import type { Meta, StoryObj } from '@storybook/react-vite'
import { SegmentedControl } from '@/src/primitives/segmented-control.tsx'
import { SegmentedOption } from '@/src/primitives/segmented-option.tsx'

const meta = {
  title: 'Primitives/SegmentedControl',
  component: SegmentedControl,
  args: {
    children: (
      <>
        <SegmentedOption active>light</SegmentedOption>
        <SegmentedOption active={false}>dark</SegmentedOption>
      </>
    ),
  },
} satisfies Meta<typeof SegmentedControl>

export default meta

export const Default: StoryObj<typeof meta> = {}
