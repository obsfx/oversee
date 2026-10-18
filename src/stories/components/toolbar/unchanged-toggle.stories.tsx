import type { Meta, StoryObj } from '@storybook/react-vite'
import { UnchangedToggle } from '../../../components/toolbar/unchanged-toggle.tsx'

const meta = {
  title: 'Components/Toolbar/UnchangedToggle',
  component: UnchangedToggle,
} satisfies Meta<typeof UnchangedToggle>

export default meta

export const Default: StoryObj<typeof meta> = {}
