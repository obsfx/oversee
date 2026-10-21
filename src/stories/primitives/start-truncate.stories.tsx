import type { Meta, StoryObj } from '@storybook/react-vite'
import { StartTruncate } from '@/src/primitives/start-truncate.tsx'

const meta = {
  title: 'Primitives/StartTruncate',
  component: StartTruncate,
  args: {
    children: '/Users/dev/.nvm/versions/node/v22.11.0/lib/node_modules/typescript/lib/lib.es5.d.ts',
    title: '/Users/dev/.nvm/versions/node/v22.11.0/lib/node_modules/typescript/lib/lib.es5.d.ts',
  },
  decorators: [
    (Story) => {
      return (
        <div className={'flex w-64 text-xs text-fg'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof StartTruncate>

export default meta

type Story = StoryObj<typeof meta>

export const LongPath: Story = {}

export const ShortPath: Story = { args: { children: 'src/lib', title: 'src/lib' } }
