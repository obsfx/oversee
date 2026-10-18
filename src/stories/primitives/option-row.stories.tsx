import type { Meta, StoryObj } from '@storybook/react-vite'
import { VscEdit, VscGitBranch } from 'react-icons/vsc'
import { fn } from 'storybook/test'
import { OptionRow } from '@/src/primitives/option-row.tsx'

const meta = {
  title: 'Primitives/OptionRow',
  component: OptionRow,
  args: { icon: VscGitBranch, label: 'feat/comment-threads', selected: false, onSelect: fn() },
  decorators: [
    (Story) => {
      return (
        <div className={'w-64'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof OptionRow>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Selected: Story = { args: { selected: true } }

export const Uncommitted: Story = { args: { icon: VscEdit, label: 'Uncommitted changes' } }
