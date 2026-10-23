import type { Meta, StoryObj } from '@storybook/react-vite'
import { TreeGroupLabel } from '@/src/primitives/tree-group-label.tsx'
import { TreeRow } from '@/src/primitives/tree-row.tsx'

const meta = {
  title: 'Primitives/TreeGroupLabel',
  component: TreeGroupLabel,
  args: { label: 'Not connected', count: 3 },
  decorators: [
    (Story) => {
      return (
        <div role={'tree'} className={'w-72 bg-sidebar py-1'}>
          <TreeRow depth={0} selected={false}>
            <Story />
          </TreeRow>
        </div>
      )
    },
  ],
} satisfies Meta<typeof TreeGroupLabel>

export default meta

export const Default: StoryObj<typeof meta> = {}
