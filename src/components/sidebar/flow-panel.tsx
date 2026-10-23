import { useFlowPanel } from '@/src/hooks/use-flow-panel.ts'
import { CallFlowLabels } from '@/src/lib/call-flow-labels.ts'
import { FlowProgressLabels } from '@/src/lib/flow-progress-labels.ts'
import { MutedHint } from '@/src/primitives/muted-hint.tsx'
import { ProgressLine } from '@/src/primitives/progress-line.tsx'
import { SidebarToolbar } from '@/src/primitives/sidebar-toolbar.tsx'
import { CallFlowTreeView } from '@/src/components/sidebar/call-flow-tree-view.tsx'
import { ExpandAllButton } from '@/src/components/sidebar/expand-all-button.tsx'
import { FlowServerNoticeList } from '@/src/components/sidebar/flow-server-notice-list.tsx'
import { SidebarEmpty } from '@/src/components/sidebar/sidebar-empty.tsx'
import { SidebarFailed } from '@/src/components/sidebar/sidebar-failed.tsx'
import { TreeFilter } from '@/src/components/sidebar/tree-filter.tsx'

export function FlowPanel() {
  const { content, progress, failure, retry, tree, attachScrollElement, notices } = useFlowPanel()

  return (
    <>
      {progress !== null && (
        <ProgressLine
          label={FlowProgressLabels.overall}
          ratio={progress.ratio}
          phase={progress.phase}
        />
      )}
      {content === 'tree' && (
        <SidebarToolbar>
          <TreeFilter label={CallFlowLabels.filter} value={tree.query} onChange={tree.setQuery} />
          <ExpandAllButton
            expanded={tree.allExpanded}
            disabled={tree.filtering}
            onToggle={tree.toggleAllExpanded}
          />
        </SidebarToolbar>
      )}
      <FlowServerNoticeList notices={notices} />
      <div className={'min-h-0 flex-1'}>
        {content === 'failed' && (
          <SidebarFailed label={CallFlowLabels.failed} reason={failure} onRetry={retry} />
        )}
        {content === 'empty' && <SidebarEmpty label={CallFlowLabels.empty} />}
        {content === 'tree' && tree.rows.length === 0 && (
          <MutedHint>{CallFlowLabels.noMatch}</MutedHint>
        )}
        {content === 'tree' && tree.rows.length > 0 && (
          <CallFlowTreeView tree={tree} scroller={attachScrollElement} />
        )}
      </div>
    </>
  )
}
