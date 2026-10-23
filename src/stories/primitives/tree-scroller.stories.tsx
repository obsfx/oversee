import type { Meta, StoryObj } from '@storybook/react-vite'
import { TreeRow } from '@/src/primitives/tree-row.tsx'
import { TreeScroller } from '@/src/primitives/tree-scroller.tsx'
import { VirtualRow } from '@/src/primitives/virtual-row.tsx'

const rows = Array.from({ length: 60 }, (_, index) => {
  return `file-${String(index + 1).padStart(2, '0')}.ts`
})

const meta = {
  title: 'Primitives/TreeScroller',
  component: TreeScroller,
  args: {
    totalSize: rows.length * 20,
    'aria-label': 'Changed files',
    children: rows.map((name, index) => {
      return (
        <VirtualRow key={name} start={index * 20}>
          <TreeRow depth={0} selected={index === 3}>
            {name}
          </TreeRow>
        </VirtualRow>
      )
    }),
  },
  decorators: [
    (Story) => {
      return (
        <div className={'h-64 w-72 bg-sidebar'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof TreeScroller>

export default meta

export const Default: StoryObj<typeof meta> = {}
