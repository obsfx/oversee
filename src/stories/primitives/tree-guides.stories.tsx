import type { Meta, StoryObj } from '@storybook/react-vite'
import { TreeGuides } from '@/src/primitives/tree-guides.tsx'
import { TreeRow } from '@/src/primitives/tree-row.tsx'

const meta = {
  title: 'Primitives/TreeGuides',
  component: TreeGuides,
  args: { depth: 3 },
  decorators: [
    (Story, context) => {
      return (
        <div role={'tree'} className={'w-72 bg-sidebar py-1'}>
          <TreeRow depth={context.args.depth} selected={false}>
            <Story />
            {'useFileContent'}
          </TreeRow>
        </div>
      )
    },
  ],
} satisfies Meta<typeof TreeGuides>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Root: Story = { args: { depth: 0 } }

export const Deep: Story = { args: { depth: 8 } }
