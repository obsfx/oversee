import { LuChevronsDownUp, LuChevronsUpDown } from 'react-icons/lu'
import { VscEye, VscEyeClosed } from 'react-icons/vsc'
import { useSidebar } from '@/src/hooks/use-sidebar.ts'
import { SidebarIconButton } from '@/src/primitives/sidebar-icon-button.tsx'
import { SidebarShell } from '@/src/primitives/sidebar-shell.tsx'
import { SidebarToolbar } from '@/src/primitives/sidebar-toolbar.tsx'
import { Tooltip } from '@/src/primitives/tooltip.tsx'
import { FileTreeView } from '@/src/components/sidebar/file-tree-view.tsx'
import { SidebarEmpty } from '@/src/components/sidebar/sidebar-empty.tsx'
import { SidebarFailed } from '@/src/components/sidebar/sidebar-failed.tsx'
import { SidebarLoading } from '@/src/components/sidebar/sidebar-loading.tsx'
import { TreeFilter } from '@/src/components/sidebar/tree-filter.tsx'

export function Sidebar() {
  const {
    state,
    retry,
    tree,
    hideReviewed,
    toggleHideReviewed,
    allExpanded,
    toggleAllExpanded,
    isEmpty,
  } = useSidebar()
  const expansionLabel = allExpanded ? 'Collapse all' : 'Expand all'
  const visibilityLabel = hideReviewed ? 'Show reviewed files' : 'Hide reviewed files'
  const hasFiles = state.status === 'ready' && !isEmpty

  return (
    <SidebarShell>
      {hasFiles && (
        <SidebarToolbar>
          <TreeFilter model={tree.model} />
          <Tooltip label={visibilityLabel}>
            <SidebarIconButton
              aria-label={visibilityLabel}
              aria-pressed={hideReviewed}
              onClick={toggleHideReviewed}
            >
              {hideReviewed ? <VscEyeClosed /> : <VscEye />}
            </SidebarIconButton>
          </Tooltip>
          <Tooltip label={expansionLabel}>
            <SidebarIconButton aria-label={expansionLabel} onClick={toggleAllExpanded}>
              {allExpanded ? <LuChevronsDownUp /> : <LuChevronsUpDown />}
            </SidebarIconButton>
          </Tooltip>
        </SidebarToolbar>
      )}
      <div className={'min-h-0 flex-1'}>
        {state.status === 'failed' && (
          <SidebarFailed reason={state.error.message} onRetry={retry} />
        )}
        {(state.status === 'idle' || state.status === 'loading') && <SidebarLoading />}
        {state.status === 'ready' && isEmpty && <SidebarEmpty />}
        {hasFiles && <FileTreeView model={tree.model} />}
      </div>
    </SidebarShell>
  )
}
