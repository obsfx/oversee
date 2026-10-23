import { Group, Panel, useDefaultLayout } from 'react-resizable-panels'
import { Sidebar } from '@/src/components/sidebar/sidebar.tsx'
import { PanelLayout } from '@/src/lib/panel-layout.ts'
import { ResizeHandle } from '@/src/primitives/resize-handle.tsx'
import { useLayoutStore } from '@/src/store/layout-store.ts'
import { ReviewMain } from '@/src/layouts/review-main.tsx'
import { useReviewSync } from '@/src/hooks/use-review-sync.ts'

export function ReviewLayout() {
  useReviewSync()
  const sidebarExpanded = useLayoutStore((layout) => {
    return layout.sidebarExpanded
  })
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: 'oversee.review-layout',
    storage: localStorage,
  })

  return (
    <div className={'h-screen overflow-hidden bg-surface text-fg'}>
      {sidebarExpanded ? (
        <Group
          orientation={'horizontal'}
          defaultLayout={defaultLayout}
          onLayoutChanged={onLayoutChanged}
          resizeTargetMinimumSize={PanelLayout.resizeTarget}
        >
          <Panel id={'sidebar'} {...PanelLayout.sidebar}>
            <Sidebar />
          </Panel>
          <ResizeHandle />
          <Panel id={'main'}>
            <ReviewMain />
          </Panel>
        </Group>
      ) : (
        <ReviewMain />
      )}
    </div>
  )
}
