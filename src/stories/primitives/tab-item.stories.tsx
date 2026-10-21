import type { Meta, StoryObj } from '@storybook/react-vite'
import { VscDiff, VscDiffMultiple, VscFile } from 'react-icons/vsc'
import { fn } from 'storybook/test'
import { TabItem } from '@/src/primitives/tab-item.tsx'

const meta = {
  title: 'Primitives/TabItem',
  component: TabItem,
  args: {
    active: true,
    icon: <VscDiff className={'text-status-modified'} />,
    title: 'expire_password.ts',
    tooltip: 'scripts/expire_password.ts',
    closeLabel: 'Close expire_password.ts',
    onSelect: fn(),
    onClose: fn(),
  },
  decorators: [
    (Story) => {
      return (
        <div className={'flex h-7 border-b border-line bg-surface-subtle text-xs'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof TabItem>

export default meta

type Story = StoryObj<typeof meta>

export const Active: Story = {}

export const Inactive: Story = { args: { active: false } }

export const ReadOnly: Story = {
  args: { icon: <VscFile />, title: 'session.repository.ts', italic: true },
}

export const WithoutClose: Story = {
  args: { icon: <VscDiffMultiple />, title: 'Review', onClose: undefined },
}

export const LongTitleWithHint: Story = {
  args: {
    title: 'user-notification-preferences.contro',
    label: 'user-notification-preferences.controller.spec.ts, notifications',
    titleTail: 'ller.spec.ts',
    hint: 'notifications',
    tooltip: 'src/modules/notifications/user-notification-preferences.controller.spec.ts',
  },
}
