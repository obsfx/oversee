import type { Meta, StoryObj } from '@storybook/react-vite'
import { VscWarning } from 'react-icons/vsc'
import { fn } from 'storybook/test'
import { WarningBar } from '@/src/primitives/warning-bar.tsx'

const meta = {
  title: 'Primitives/WarningBar',
  component: WarningBar,
  decorators: [
    (Story) => {
      return (
        <div className={'w-[44rem] border border-line bg-surface text-xs'}>
          <Story />
        </div>
      )
    },
  ],
  args: {
    icon: <VscWarning />,
    title: 'feat/comment-threads was deleted.',
    detail: 'Showing Uncommitted changes into main',
    actionLabel: 'Dismiss',
    onAction: fn(),
  },
} satisfies Meta<typeof WarningBar>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const LongDetail: Story = {
  decorators: [
    (Story) => {
      return (
        <div className={'w-96'}>
          <Story />
        </div>
      )
    },
  ],
  args: {
    title: 'feat/upgrade-deprecated-versions was deleted.',
    detail: 'Showing Uncommitted changes into release/2026.10-hotfix-candidate',
  },
}
