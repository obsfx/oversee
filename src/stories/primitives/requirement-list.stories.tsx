import type { Meta, StoryObj } from '@storybook/react-vite'
import { RequirementList } from '@/src/primitives/requirement-list.tsx'

const meta = {
  title: 'Primitives/RequirementList',
  component: RequirementList,
  args: {
    items: [
      { tool: 'node', missing: false, title: 'node is on PATH' },
      { tool: 'npm', missing: false, title: 'npm is on PATH' },
    ],
  },
  decorators: [
    (Story) => {
      return (
        <div className={'w-72 text-xs'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof RequirementList>

export default meta

type Story = StoryObj<typeof meta>

export const AllFound: Story = {}

export const Missing: Story = {
  args: {
    items: [
      { tool: 'java', missing: true, title: 'java is not on PATH' },
      { tool: 'python3', missing: false, title: 'python3 is on PATH' },
    ],
  },
}
