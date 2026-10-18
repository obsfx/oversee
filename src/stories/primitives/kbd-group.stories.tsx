import type { Meta, StoryObj } from '@storybook/react-vite'
import { Kbd } from '@/src/primitives/kbd.tsx'
import { KbdGroup } from '@/src/primitives/kbd-group.tsx'

const meta = {
  title: 'Primitives/KbdGroup',
  component: KbdGroup,
  args: {
    children: (
      <>
        <Kbd>Ctrl</Kbd>
        <Kbd>Enter</Kbd>
      </>
    ),
  },
} satisfies Meta<typeof KbdGroup>

export default meta

export const Default: StoryObj<typeof meta> = {}
