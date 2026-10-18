import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { ReviewedToggle } from '@/src/components/toolbar/reviewed-toggle.tsx'

const meta = {
  title: 'Components/Toolbar/ReviewedToggle',
  component: ReviewedToggle,
  args: { path: 'src/modules/auth/session.service.ts', onMarked: fn() },
} satisfies Meta<typeof ReviewedToggle>

export default meta

export const Default: StoryObj<typeof meta> = {}
