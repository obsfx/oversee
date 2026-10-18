import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { PanelHeader } from '@/src/primitives/panel-header.tsx'

const meta = {
  title: 'Primitives/PanelHeader',
  component: PanelHeader,
  args: { title: 'Interface', onBack: fn() },
} satisfies Meta<typeof PanelHeader>

export default meta

export const Default: StoryObj<typeof meta> = {}
