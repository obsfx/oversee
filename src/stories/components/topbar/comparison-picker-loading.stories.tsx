import type { Meta, StoryObj } from '@storybook/react-vite'
import { ComparisonPickerLoading } from '@/src/components/topbar/comparison-picker-loading.tsx'

const meta = {
  title: 'Components/Topbar/ComparisonPickerLoading',
  component: ComparisonPickerLoading,
} satisfies Meta<typeof ComparisonPickerLoading>

export default meta

export const Default: StoryObj<typeof meta> = {}
