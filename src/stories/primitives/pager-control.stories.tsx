import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { PagerControl } from '@/src/primitives/pager-control.tsx'

const meta = {
  title: 'Primitives/PagerControl',
  component: PagerControl,
  args: {
    position: 1,
    count: 2,
    previousLabel: 'Previous definition',
    nextLabel: 'Next definition',
    onPrevious: fn(),
    onNext: fn(),
  },
} satisfies Meta<typeof PagerControl>

export default meta

type Story = StoryObj<typeof meta>

export const FirstOfTwo: Story = {}

export const ThirdOfTwelve: Story = { args: { position: 3, count: 12 } }

export const ManyDefinitions: Story = { args: { position: 1, count: 128 } }

export const AtStart: Story = { args: { position: 1, count: 4, previousDisabled: true } }

export const AtEnd: Story = { args: { position: 4, count: 4, nextDisabled: true } }
