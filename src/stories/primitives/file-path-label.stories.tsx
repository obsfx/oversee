import type { Meta, StoryObj } from '@storybook/react-vite'
import { FilePathLabel } from '@/src/primitives/file-path-label.tsx'

const meta = {
  title: 'Primitives/FilePathLabel',
  component: FilePathLabel,
  args: { directory: 'src/modules/auth/', name: 'session.service.ts' },
  decorators: [
    (Story) => {
      return (
        <div className={'flex text-xs'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof FilePathLabel>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const RootFile: Story = {
  args: { directory: '', name: 'package.json' },
}

export const Truncated: Story = {
  decorators: [
    (Story) => {
      return (
        <div className={'flex w-48 text-xs'}>
          <Story />
        </div>
      )
    },
  ],
}
