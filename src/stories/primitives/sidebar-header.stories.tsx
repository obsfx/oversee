import type { Meta, StoryObj } from '@storybook/react-vite'
import { VscEye } from 'react-icons/vsc'
import { Button } from '../../primitives/button.tsx'
import { ProgressTrack } from '../../primitives/progress-track.tsx'
import { SidebarHeader } from '../../primitives/sidebar-header.tsx'

const meta = {
  title: 'Primitives/SidebarHeader',
  component: SidebarHeader,
  decorators: [
    (Story) => {
      return (
        <div className={'w-72 bg-sidebar text-xs'}>
          <Story />
        </div>
      )
    },
  ],
  args: {
    children: (
      <>
        <ProgressTrack reviewed={3} total={80} percent={3.75} />
        <Button>
          <VscEye />
          Hide reviewed
        </Button>
      </>
    ),
  },
} satisfies Meta<typeof SidebarHeader>

export default meta

export const Default: StoryObj<typeof meta> = {}
