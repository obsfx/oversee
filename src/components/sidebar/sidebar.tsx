import { LuChevronsDownUp, LuChevronsUpDown } from 'react-icons/lu'
import { VscEye, VscEyeClosed } from 'react-icons/vsc'
import { useSidebar } from '../../hooks/use-sidebar.ts'
import { Button } from '../../primitives/button.tsx'
import { ProgressTrack } from '../../primitives/progress-track.tsx'
import { SidebarHeader } from '../../primitives/sidebar-header.tsx'
import { SidebarShell } from '../../primitives/sidebar-shell.tsx'
import { SidebarToolbar } from '../../primitives/sidebar-toolbar.tsx'
import { FileTreeView } from './file-tree-view.tsx'
import { SidebarEmpty } from './sidebar-empty.tsx'
import { SidebarFailed } from './sidebar-failed.tsx'
import { SidebarLoading } from './sidebar-loading.tsx'
import { TreeFilter } from './tree-filter.tsx'

export function Sidebar() {
  const { state, retry, tree, progress, hideReviewed, toggleHideReviewed, isEmpty } = useSidebar()
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
              title={'Expand all'}
              aria-label={'Expand all'}
              onClick={() => {
                tree.setExpanded(true)
              }}
            >
              <LuChevronsUpDown className={'size-4'} />
            </Button>
            <Button
              variant={'ghost'}
              icon
              title={'Collapse all'}
              aria-label={'Collapse all'}
              onClick={() => {
                tree.setExpanded(false)
              }}
            >
              <LuChevronsDownUp className={'size-4'} />
            </Button>
          </SidebarToolbar>
        </>
      )}
      <div className={'min-h-0 flex-1 pt-1'}>
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
