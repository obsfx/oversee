import type { Meta, StoryObj } from '@storybook/react-vite'
import { BareInput } from '../../primitives/bare-input.tsx'

const meta = {
  title: 'Primitives/BareInput',
  component: BareInput,
  args: { placeholder: 'Filter branches' },
} satisfies Meta<typeof BareInput>

export default meta

export const Default: StoryObj<typeof meta> = {}
