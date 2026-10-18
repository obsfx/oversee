import type { Meta, StoryObj } from '@storybook/react-vite'
import { VscGitBranch } from 'react-icons/vsc'
import { fn } from 'storybook/test'
import { OptionList } from '../../primitives/option-list.tsx'
import { OptionRow } from '../../primitives/option-row.tsx'
import { branchList } from '../support/fixtures.ts'

const meta = {
  title: 'Primitives/OptionList',
  component: OptionList,
  args: {
    children: branchList.branches.map((branch) => {
      return (
        <OptionRow
          key={branch}
          icon={VscGitBranch}
          label={branch}
          selected={branch === 'main'}
          onSelect={fn()}
        />
      )
    }),
  },
  decorators: [
    (Story) => {
      return (
        <div className={'w-64 rounded-md border border-line'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof OptionList>

export default meta

export const Default: StoryObj<typeof meta> = {}
