import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { PopoverStatus } from '@/src/primitives/popover-status.tsx'
import { TextButton } from '@/src/primitives/text-button.tsx'

const meta = {
  title: 'Primitives/PopoverStatus',
  component: PopoverStatus,
  args: {
    loading: false,
    title: 'typescript-language-server is indexing',
    detail: 'Try again in a moment',
  },
  decorators: [
    (Story) => {
      return (
        <div className={'w-80 rounded-md border border-line bg-popup text-xs'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof PopoverStatus>

export default meta

type Story = StoryObj<typeof meta>

export const Message: Story = {}

export const Loading: Story = {
  args: { loading: true, title: 'Looking up the definition', detail: '' },
}

export const WithAction: Story = {
  args: {
    title: 'typescript-language-server is not installed',
    detail: 'Install it to go to definitions',
    children: (
      <TextButton className={'self-start'} onClick={fn()}>
        Install
      </TextButton>
    ),
  },
}
