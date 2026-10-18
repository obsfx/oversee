import { Group, Panel, useDefaultLayout } from 'react-resizable-panels'
import { Sidebar } from '@/src/components/sidebar/sidebar.tsx'
import { PanelLayout } from '@/src/lib/panel-layout.ts'
import { ResizeHandle } from '@/src/primitives/resize-handle.tsx'
import { useLayoutStore } from '@/src/store/layout-store.ts'
import { useSettingsStore } from '@/src/store/settings-store.ts'
import { ReviewMain } from '@/src/layouts/review-main.tsx'

export function ReviewLayout() {
  const sidebarExpanded = useLayoutStore((layout) => {
    return layout.sidebarExpanded
  })
  const uiFontSize = useSettingsStore((settings) => {
    return settings.uiFontSize
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
            <Sidebar key={uiFontSize} />
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
