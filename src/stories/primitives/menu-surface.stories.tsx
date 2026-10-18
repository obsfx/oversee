import type { Meta, StoryObj } from '@storybook/react-vite'
import { MenuItem } from '../../primitives/menu-item.tsx'
import { MenuSurface } from '../../primitives/menu-surface.tsx'

const meta = {
  title: 'Primitives/MenuSurface',
  component: MenuSurface,
  args: { children: <MenuItem>Mark as reviewed</MenuItem>, className: 'w-48' },
} satisfies Meta<typeof MenuSurface>

export default meta

export const Default: StoryObj<typeof meta> = {}
