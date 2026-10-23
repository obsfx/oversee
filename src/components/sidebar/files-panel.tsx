import { VscEye, VscEyeClosed } from 'react-icons/vsc'
import { useFilesPanel } from '@/src/hooks/use-files-panel.ts'
import { FileTreeLabels } from '@/src/lib/file-tree-labels.ts'
import { MutedHint } from '@/src/primitives/muted-hint.tsx'
import { SidebarIconButton } from '@/src/primitives/sidebar-icon-button.tsx'
import { SidebarToolbar } from '@/src/primitives/sidebar-toolbar.tsx'
import { Tooltip } from '@/src/primitives/tooltip.tsx'
import { ExpandAllButton } from '@/src/components/sidebar/expand-all-button.tsx'
import { FileTreeView } from '@/src/components/sidebar/file-tree-view.tsx'
import { SidebarEmpty } from '@/src/components/sidebar/sidebar-empty.tsx'
import { SidebarFailed } from '@/src/components/sidebar/sidebar-failed.tsx'
import { SidebarLoading } from '@/src/components/sidebar/sidebar-loading.tsx'
import { TreeFilter } from '@/src/components/sidebar/tree-filter.tsx'
import { UnmarkAllButton } from '@/src/components/sidebar/unmark-all-button.tsx'

export function FilesPanel() {
  const { state, retry, tree, attachScrollElement, hideReviewed, toggleHideReviewed, isEmpty } =
    useFilesPanel()
  const visibilityLabel = hideReviewed ? 'Show reviewed files' : 'Hide reviewed files'
  const hasFiles = state.status === 'ready' && !isEmpty

  return (
    <>
      {hasFiles && (
        <SidebarToolbar>
          <TreeFilter label={FileTreeLabels.filter} value={tree.query} onChange={tree.setQuery} />
          <Tooltip label={visibilityLabel}>
            <SidebarIconButton
              aria-label={visibilityLabel}
              aria-pressed={hideReviewed}
              onClick={toggleHideReviewed}
            >
              {hideReviewed ? <VscEyeClosed /> : <VscEye />}
            </SidebarIconButton>
          </Tooltip>
          <UnmarkAllButton />
          <ExpandAllButton
            expanded={tree.allExpanded}
            disabled={tree.filtering}
            onToggle={tree.toggleAllExpanded}
          />
        </SidebarToolbar>
      )}
      <div className={'min-h-0 flex-1'}>
        {state.status === 'failed' && (
          <SidebarFailed
            label={FileTreeLabels.failed}
            reason={state.error.message}
            onRetry={retry}
          />
        )}
        {(state.status === 'idle' || state.status === 'loading') && (
          <SidebarLoading label={FileTreeLabels.loading} />
        )}
        {state.status === 'ready' && isEmpty && <SidebarEmpty label={FileTreeLabels.empty} />}
        {hasFiles && tree.rows.length === 0 && (
          <MutedHint>{FileTreeLabels.noRows(tree.query)}</MutedHint>
        )}
        {hasFiles && tree.rows.length > 0 && (
          <FileTreeView tree={tree} scroller={attachScrollElement} />
        )}
      </div>
    </>
  )
}
