import type { Meta, StoryObj } from '@storybook/react-vite'
import { MutedHint } from '../../primitives/muted-hint.tsx'

const meta = {
  title: 'Primitives/MutedHint',
  component: MutedHint,
  args: { children: 'No branches' },
} satisfies Meta<typeof MutedHint>

export default meta

export const Default: StoryObj<typeof meta> = {}
