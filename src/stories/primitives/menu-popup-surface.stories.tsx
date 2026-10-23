import { Menu } from '@base-ui/react/menu'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { MenuItem } from '@/src/primitives/menu-item.tsx'
import { MenuPopupSurface } from '@/src/primitives/menu-popup-surface.tsx'
import { SidebarModeIcon } from '@/src/primitives/sidebar-mode-icon.tsx'
import { SidebarTitleButton } from '@/src/primitives/sidebar-title-button.tsx'

const meta = {
  title: 'Primitives/MenuPopupSurface',
  component: MenuPopupSurface,
  args: {
    align: 'start',
    className: 'w-48',
    children: (
      <>
        <Menu.Item nativeButton={true} render={<MenuItem />}>
          First action
        </Menu.Item>
        <Menu.Item nativeButton={true} render={<MenuItem />}>
          Second action
        </Menu.Item>
      </>
    ),
  },
  render: (args) => {
    return (
      <div className={'flex w-72 justify-between bg-sidebar p-1 text-xs'}>
        <Menu.Root defaultOpen={true}>
          <Menu.Trigger render={<SidebarTitleButton icon={<SidebarModeIcon mode={'files'} />} />}>
            Files
          </Menu.Trigger>
          <MenuPopupSurface {...args} />
        </Menu.Root>
      </div>
    )
  },
} satisfies Meta<typeof MenuPopupSurface>

export default meta

type Story = StoryObj<typeof meta>

export const AlignStart: Story = {}

export const AlignEnd: Story = { args: { align: 'end' } }
