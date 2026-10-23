import type { Meta, StoryObj } from '@storybook/react-vite'
import { TreeRow } from '@/src/primitives/tree-row.tsx'
import { VirtualRow } from '@/src/primitives/virtual-row.tsx'

const meta = {
  title: 'Primitives/VirtualRow',
  component: VirtualRow,
  args: {
    start: 40,
    children: (
      <TreeRow depth={0} selected={false}>
        {'placed 40px from the top'}
      </TreeRow>
    ),
  },
  decorators: [
    (Story) => {
      return (
        <div role={'tree'} className={'relative h-32 w-72 bg-sidebar'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof VirtualRow>

export default meta

export const Default: StoryObj<typeof meta> = {}
