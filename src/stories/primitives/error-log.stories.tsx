import type { Meta, StoryObj } from '@storybook/react-vite'
import { ErrorLog } from '@/src/primitives/error-log.tsx'

const meta = {
  title: 'Primitives/ErrorLog',
  component: ErrorLog,
  args: {
    children:
      'npm install --prefix /Users/dev/.oversee/lsp/.tmp/intelephense: exit status 1\nnpm ERR! code ETIMEDOUT\nnpm ERR! network request to https://registry.npmjs.org/intelephense failed, reason: connect ETIMEDOUT',
  },
  decorators: [
    (Story) => {
      return (
        <div className={'w-80 text-xs'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof ErrorLog>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Short: Story = { args: { children: 'checksum 3f1c does not match 9ab2' } }
