import type { Meta, StoryObj } from '@storybook/react-vite'
import { Group, Panel } from 'react-resizable-panels'
import { ResizeHandle } from '../../primitives/resize-handle.tsx'

const meta = {
  title: 'Primitives/ResizeHandle',
  component: ResizeHandle,
  render: () => {
    return (
      <div className={'h-40 border border-line text-xs'}>
        <Group orientation={'horizontal'}>
          <Panel defaultSize={'30%'} minSize={'20%'} className={'bg-sidebar p-2'}>
            Drag the handle
          </Panel>
          <ResizeHandle />
          <Panel className={'p-2'}>Main</Panel>
        </Group>
      </div>
    )
  },
} satisfies Meta<typeof ResizeHandle>

export default meta

export const Default: StoryObj<typeof meta> = {}
