import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { DisclosureButton } from '@/src/primitives/disclosure-button.tsx'

const meta = {
  title: 'Primitives/DisclosureButton',
  component: DisclosureButton,
  args: { expanded: false, onClick: fn(), children: 'Install failed' },
  decorators: [
    (Story) => {
      return (
        <div className={'w-48 text-mini text-danger'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof DisclosureButton>

export default meta

type Story = StoryObj<typeof meta>

export const Collapsed: Story = {}

export const Expanded: Story = { args: { expanded: true } }
