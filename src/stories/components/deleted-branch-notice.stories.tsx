import type { Meta, StoryObj } from '@storybook/react-vite'
import { DeletedBranchNotice } from '@/src/components/deleted-branch-notice.tsx'
import { ComparisonRules, type ComparisonReplacement } from '@/src/lib/comparison-rules.ts'
import { useComparisonStore } from '@/src/store/comparison-store.ts'

const showNotice = (replacement: ComparisonReplacement) => {
  return () => {
    useComparisonStore.setState({ selected: replacement.comparison, notice: replacement })
  }
}

const meta = {
  title: 'Components/DeletedBranchNotice',
  component: DeletedBranchNotice,
  decorators: [
    (Story) => {
      return (
        <div className={'w-[44rem] border border-line bg-surface text-xs text-fg'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof DeletedBranchNotice>

export default meta

type Story = StoryObj<typeof meta>

export const SourceDeleted: Story = {
  beforeEach: showNotice({
    comparison: { source: ComparisonRules.uncommitted, target: 'main' },
    deleted: ['feat/comment-threads'],
  }),
}

export const TargetDeleted: Story = {
  beforeEach: showNotice({
    comparison: { source: ComparisonRules.branch('feat/comment-threads'), target: 'develop' },
    deleted: ['main'],
  }),
}

export const BothDeleted: Story = {
  beforeEach: showNotice({
    comparison: { source: ComparisonRules.uncommitted, target: 'develop' },
    deleted: ['feat/comment-threads', 'main'],
  }),
}
