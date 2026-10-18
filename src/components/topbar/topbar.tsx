import { TopbarGroup } from '../../primitives/topbar-group.tsx'
import { TopbarShell } from '../../primitives/topbar-shell.tsx'
import { CommentsMenu } from './comments-menu.tsx'
import { ComparisonPicker } from './comparison-picker.tsx'
import { DiffStats } from './diff-stats.tsx'
import { SettingsMenu } from './settings-menu.tsx'
import { SidebarToggle } from './sidebar-toggle.tsx'

export function Topbar() {
  return (
    <TopbarShell>
      <TopbarGroup>
        <SidebarToggle />
        <ComparisonPicker />
        <DiffStats />
      </TopbarGroup>
      <TopbarGroup>
        <CommentsMenu />
        <SettingsMenu />
      </TopbarGroup>
    </TopbarShell>
  )
}
