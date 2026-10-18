import { TopbarGroup } from '@/src/primitives/topbar-group.tsx'
import { TopbarShell } from '@/src/primitives/topbar-shell.tsx'
import { CommentsMenu } from '@/src/components/topbar/comments-menu.tsx'
import { ComparisonPicker } from '@/src/components/topbar/comparison-picker.tsx'
import { DiffStats } from '@/src/components/topbar/diff-stats.tsx'
import { FinishReviewButton } from '@/src/components/topbar/finish-review-button.tsx'
import { SettingsMenu } from '@/src/components/topbar/settings-menu.tsx'
import { SidebarToggle } from '@/src/components/topbar/sidebar-toggle.tsx'

export function Topbar() {
  return (
    <TopbarShell>
      <TopbarGroup>
        <SidebarToggle />
        <ComparisonPicker />
        <DiffStats />
      </TopbarGroup>
      <TopbarGroup>
        <FinishReviewButton />
        <CommentsMenu />
        <SettingsMenu />
      </TopbarGroup>
    </TopbarShell>
  )
}
