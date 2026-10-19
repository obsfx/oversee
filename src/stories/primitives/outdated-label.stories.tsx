import type { Meta, StoryObj } from '@storybook/react-vite'
import { OutdatedLabel } from '@/src/primitives/outdated-label.tsx'

const meta = {
  title: 'Primitives/OutdatedLabel',
  component: OutdatedLabel,
  decorators: [
    (Story) => {
      return (
        <div className={'text-mini'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof OutdatedLabel>

export default meta

export const Default: StoryObj<typeof meta> = {}
