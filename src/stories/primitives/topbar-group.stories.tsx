import type { Meta, StoryObj } from '@storybook/react-vite'
import { VscComment, VscSettingsGear } from 'react-icons/vsc'
import { IconButton } from '@/src/primitives/icon-button.tsx'
import { TopbarGroup } from '@/src/primitives/topbar-group.tsx'

const meta = {
  title: 'Primitives/TopbarGroup',
  component: TopbarGroup,
  args: {
    children: (
      <>
        <IconButton aria-label={'Comments'}>
          <VscComment />
        </IconButton>
        <IconButton aria-label={'Settings'}>
          <VscSettingsGear />
        </IconButton>
      </>
    ),
  },
} satisfies Meta<typeof TopbarGroup>

export default meta

export const Default: StoryObj<typeof meta> = {}
