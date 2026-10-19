import type { Meta, StoryObj } from '@storybook/react-vite'
import { VscCheckAll, VscDiff } from 'react-icons/vsc'
import { DiffPlaceholder } from '@/src/primitives/diff-placeholder.tsx'

const meta = {
  title: 'Primitives/DiffPlaceholder',
  component: DiffPlaceholder,
  decorators: [
    (Story) => {
      return (
        <div className={'h-80 w-[36rem] border border-line bg-surface text-xs'}>
          <Story />
        </div>
      )
    },
  ],
  args: {
    icon: <VscCheckAll />,
    title: 'No changes',
    detail: 'The working tree matches HEAD',
  },
} satisfies Meta<typeof DiffPlaceholder>

export default meta

type Story = StoryObj<typeof meta>

export const NoChanges: Story = {}

export const BranchWithoutChanges: Story = {
  args: { detail: 'feat/comment-threads has no changes against main' },
}

export const RenamedWithoutChanges: Story = {
  args: {
    icon: <VscDiff />,
    title: 'No content changes',
    detail: 'Renamed from src/lib/session-cache.ts',
  },
}

export const EmptyFile: Story = {
  args: { icon: <VscDiff />, title: 'No content changes', detail: 'Empty file added' },
}
