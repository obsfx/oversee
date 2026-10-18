import type { Meta, StoryObj } from '@storybook/react-vite'
import { VscCheckAll } from 'react-icons/vsc'
import { CenteredStatus } from '@/src/primitives/centered-status.tsx'
import { Spinner } from '@/src/primitives/spinner.tsx'

const meta = {
  title: 'Primitives/CenteredStatus',
  component: CenteredStatus,
  decorators: [
    (Story) => {
      return (
        <div className={'h-64 w-64 bg-sidebar text-xs'}>
          <Story />
        </div>
      )
    },
  ],
  args: { icon: <Spinner />, children: 'Loading files' },
} satisfies Meta<typeof CenteredStatus>

export default meta

type Story = StoryObj<typeof meta>

export const Loading: Story = {}

export const Empty: Story = {
  args: { icon: <VscCheckAll />, children: 'No changed files' },
}
