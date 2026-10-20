import type { Meta, StoryObj } from '@storybook/react-vite'
import { InlineError } from '@/src/primitives/inline-error.tsx'

const meta = {
  title: 'Primitives/InlineError',
  component: InlineError,
  args: { children: 'Install request failed with status 409' },
} satisfies Meta<typeof InlineError>

export default meta

export const Default: StoryObj<typeof meta> = {}
