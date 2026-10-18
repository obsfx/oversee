import type { Meta, StoryObj } from '@storybook/react-vite'
import { CrumbSeparator } from '@/src/primitives/crumb-separator.tsx'

const meta = {
  title: 'Primitives/CrumbSeparator',
  component: CrumbSeparator,
} satisfies Meta<typeof CrumbSeparator>

export default meta

export const Default: StoryObj<typeof meta> = {}
