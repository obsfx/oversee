import { LuChevronsDownUp, LuChevronsUpDown } from 'react-icons/lu'
import { VscEye, VscEyeClosed } from 'react-icons/vsc'
import { useSidebar } from '@/src/hooks/use-sidebar.ts'
import { Button } from '@/src/primitives/button.tsx'
import { ProgressTrack } from '@/src/primitives/progress-track.tsx'
import { SidebarHeader } from '@/src/primitives/sidebar-header.tsx'
import { SidebarShell } from '@/src/primitives/sidebar-shell.tsx'
import { SidebarToolbar } from '@/src/primitives/sidebar-toolbar.tsx'
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
    progress,
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
        <>
          <SidebarHeader>
            <ProgressTrack {...progress} />
            <Button
              title={visibilityLabel}
              aria-label={visibilityLabel}
              aria-pressed={hideReviewed}
              variant={hideReviewed ? 'accent-subtle' : 'surface'}
              onClick={toggleHideReviewed}
            >
              {hideReviewed ? <VscEyeClosed /> : <VscEye />}
              <span className={'hidden @[16rem]:inline'}>
                {hideReviewed ? 'Show reviewed' : 'Hide reviewed'}
              </span>
            </Button>
          </SidebarHeader>
          <SidebarToolbar>
            <TreeFilter model={tree.model} />
            <Button
              variant={'ghost'}
              icon
              title={expansionLabel}
              aria-label={expansionLabel}
              onClick={toggleAllExpanded}
            >
              {allExpanded ? (
                <LuChevronsDownUp className={'size-4'} />
              ) : (
                <LuChevronsUpDown className={'size-4'} />
              )}
            </Button>
          </SidebarToolbar>
        </>
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
