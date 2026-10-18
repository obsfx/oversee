import type { Meta, StoryObj } from '@storybook/react-vite'
import { LoadingBar } from '@/src/primitives/loading-bar.tsx'

const meta = {
  title: 'Primitives/LoadingBar',
  component: LoadingBar,
  decorators: [
    (Story) => {
      return (
        <div className={'relative h-24 w-96 rounded border border-line'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof LoadingBar>

export default meta

export const Default: StoryObj<typeof meta> = {}
