import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { OpenFileRow } from '@/src/primitives/open-file-row.tsx'

const meta = {
  title: 'Primitives/OpenFileRow',
  component: OpenFileRow,
  args: {
    name: 'index.ts',
    directory: 'src/modules/billing',
    path: 'src/modules/billing/index.ts',
    current: false,
    onClick: fn(),
  },
  decorators: [
    (Story) => {
      return (
        <div className={'w-80 rounded-md border border-line bg-popup p-1 text-xs text-fg'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof OpenFileRow>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Current: Story = { args: { current: true } }

export const External: Story = {
  args: {
    name: 'lib.es5.d.ts',
    directory: '/Users/dev/.nvm/versions/node/v22.11.0/lib/node_modules/typescript/lib',
    path: '/Users/dev/.nvm/versions/node/v22.11.0/lib/node_modules/typescript/lib/lib.es5.d.ts',
  },
}
