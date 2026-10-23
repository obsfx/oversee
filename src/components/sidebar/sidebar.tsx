import { useSidebarMode } from '@/src/hooks/use-sidebar-mode.ts'
import { SidebarHeader } from '@/src/primitives/sidebar-header.tsx'
import { SidebarShell } from '@/src/primitives/sidebar-shell.tsx'
import { FilesPanel } from '@/src/components/sidebar/files-panel.tsx'
import { FlowPanel } from '@/src/components/sidebar/flow-panel.tsx'
import { SidebarModeMenu } from '@/src/components/sidebar/sidebar-mode-menu.tsx'

export function Sidebar() {
  const { mode, setMode } = useSidebarMode()

  return (
    <SidebarShell>
      <SidebarHeader>
        <SidebarModeMenu mode={mode} onChange={setMode} />
      </SidebarHeader>
      {mode === 'files' && <FilesPanel />}
      {mode === 'flow' && <FlowPanel />}
    </SidebarShell>
  )
}
