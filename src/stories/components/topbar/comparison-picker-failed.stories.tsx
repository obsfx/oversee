import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { ComparisonPickerFailed } from '@/src/components/topbar/comparison-picker-failed.tsx'

const meta = {
  title: 'Components/Topbar/ComparisonPickerFailed',
  component: ComparisonPickerFailed,
  args: { reason: 'get-branches: request failed', onRetry: fn() },
} satisfies Meta<typeof ComparisonPickerFailed>

export default meta

export const Default: StoryObj<typeof meta> = {}
