import type { Meta, StoryObj } from '@storybook/react-vite'
import { VscSettingsGear } from 'react-icons/vsc'
import { TooltipProvider } from '@/src/context/tooltip/tooltip-provider.tsx'
import { IconButton } from '@/src/primitives/icon-button.tsx'
import { Tooltip } from '@/src/primitives/tooltip.tsx'

const meta = {
  title: 'Primitives/Tooltip',
  component: Tooltip,
  args: {
    label: 'Settings',
    children: (
      <IconButton aria-label={'Settings'}>
        <VscSettingsGear />
      </IconButton>
    ),
  },
  decorators: [
    (Story) => {
      return (
        <TooltipProvider>
          <div className={'p-8'}>
            <Story />
          </div>
        </TooltipProvider>
      )
    },
  ],
} satisfies Meta<typeof Tooltip>

export default meta

export const Default: StoryObj<typeof meta> = {}
