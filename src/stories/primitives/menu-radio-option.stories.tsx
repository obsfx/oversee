import { Menu } from '@base-ui/react/menu'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { MenuPopupSurface } from '@/src/primitives/menu-popup-surface.tsx'
import { MenuRadioOption } from '@/src/primitives/menu-radio-option.tsx'
import { SidebarModeIcon } from '@/src/primitives/sidebar-mode-icon.tsx'
import { SidebarTitleButton } from '@/src/primitives/sidebar-title-button.tsx'

const meta = {
  title: 'Primitives/MenuRadioOption',
  component: MenuRadioOption,
  args: {
    value: 'files',
    icon: <SidebarModeIcon mode={'files'} />,
    title: 'Changed files',
    detail: 'The changed files as a tree',
  },
  render: (args) => {
    return (
      <div className={'flex w-72 bg-sidebar p-1 text-xs'}>
        <Menu.Root defaultOpen={true}>
          <Menu.Trigger render={<SidebarTitleButton icon={<SidebarModeIcon mode={'files'} />} />}>
            Files
          </Menu.Trigger>
          <MenuPopupSurface align={'start'} className={'min-w-52'}>
            <Menu.RadioGroup defaultValue={'files'}>
              <MenuRadioOption {...args} />
            </Menu.RadioGroup>
          </MenuPopupSurface>
        </Menu.Root>
      </div>
    )
  },
} satisfies Meta<typeof MenuRadioOption>

export default meta

type Story = StoryObj<typeof meta>

export const Checked: Story = {}

export const Unchecked: Story = {
  args: {
    value: 'flow',
    icon: <SidebarModeIcon mode={'flow'} />,
    title: 'Call flow',
    detail: 'The changed functions in call order',
  },
}
