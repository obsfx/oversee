import type { Meta, StoryObj } from '@storybook/react-vite'
import { ComposerBar } from '@/src/primitives/composer-bar.tsx'

const meta = {
  title: 'Primitives/ComposerBar',
  component: ComposerBar,
  args: { label: 'Lines 12-18', children: <span className={'px-1 text-fg-muted'}>Toolbar</span> },
  decorators: [
    (Story) => {
      return (
        <div className={'w-96'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof ComposerBar>

export default meta

export const Default: StoryObj<typeof meta> = {}
