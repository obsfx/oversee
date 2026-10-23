import { Menu } from '@base-ui/react/menu'
import { type SidebarMode, SidebarModes } from '@/src/lib/sidebar-modes.ts'
import { MenuPopupSurface } from '@/src/primitives/menu-popup-surface.tsx'
import { MenuRadioOption } from '@/src/primitives/menu-radio-option.tsx'
import { SidebarModeIcon } from '@/src/primitives/sidebar-mode-icon.tsx'
import { SidebarTitleButton } from '@/src/primitives/sidebar-title-button.tsx'

interface SidebarModeMenuProps {
  mode: SidebarMode
  onChange: (mode: SidebarMode) => void
}

export function SidebarModeMenu({ mode, onChange }: SidebarModeMenuProps) {
  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={SidebarModes.menuTriggerLabel(mode)}
        render={<SidebarTitleButton icon={<SidebarModeIcon mode={mode} />} />}
      >
        {SidebarModes.label(mode)}
      </Menu.Trigger>
      <MenuPopupSurface align={'start'} className={'min-w-52'}>
        <Menu.RadioGroup
          value={mode}
          onValueChange={(value) => {
            onChange(SidebarModes.parse(value))
          }}
        >
          {SidebarModes.all.map((option) => {
            return (
              <MenuRadioOption
                key={option}
                value={option}
                icon={<SidebarModeIcon mode={option} />}
                title={SidebarModes.title(option)}
                detail={SidebarModes.detail(option)}
              />
            )
          })}
        </Menu.RadioGroup>
      </MenuPopupSurface>
    </Menu.Root>
  )
}
