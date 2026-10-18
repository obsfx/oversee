import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { BranchOptions } from '@/src/components/topbar/branch-options.tsx'
import { branchList } from '@/src/stories/support/fixtures.ts'

const meta = {
  title: 'Components/Topbar/BranchOptions',
  component: BranchOptions,
  args: {
    placeholder: 'Filter target',
    branches: branchList.branches,
    selected: 'main',
    onSelect: fn(),
  },
  decorators: [
    (Story) => {
      return (
        <div className={'inline-block rounded-md border border-line'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof BranchOptions>

export default meta

type Story = StoryObj<typeof meta>

export const Target: Story = {}

export const SourceWithUncommitted: Story = {
  args: {
    placeholder: 'Filter source',
    selected: null,
    pinned: { label: 'Uncommitted changes', selected: true, onSelect: fn() },
  },
}

export const NoBranches: Story = { args: { branches: [] } }
