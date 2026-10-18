import { Group, Panel, useDefaultLayout } from 'react-resizable-panels'
import { Sidebar } from '../components/sidebar/sidebar.tsx'
import { PanelLayout } from '../lib/panel-layout.ts'
import { ResizeHandle } from '../primitives/resize-handle.tsx'
import { useLayoutStore } from '../store/layout-store.ts'
import { ReviewMain } from './review-main.tsx'

export function ReviewLayout() {
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
