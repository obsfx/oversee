import type { Meta, StoryObj } from '@storybook/react-vite'
import { ViewModeToggle } from '@/src/components/toolbar/view-mode-toggle.tsx'

const meta = {
  title: 'Components/Toolbar/ViewModeToggle',
  component: ViewModeToggle,
} satisfies Meta<typeof ViewModeToggle>

export default meta

export const Default: StoryObj<typeof meta> = {}
