import { useActiveTab } from '@/src/hooks/use-active-tab.ts'
import { TabContent } from '@/src/primitives/tab-content.tsx'
import { DiffTabView } from '@/src/components/definitions/diff-tab-view.tsx'
import { FileTabView } from '@/src/components/definitions/file-tab-view.tsx'
import { ReadOnlyFileNotice } from '@/src/components/definitions/read-only-file-notice.tsx'
import { DiffViewer } from '@/src/components/diff-viewer/diff-viewer.tsx'
import { LanguageServerNotice } from '@/src/components/language-server-notice.tsx'
import { Toolbar } from '@/src/components/toolbar/toolbar.tsx'

export function TabPanel() {
  const { active, view, hasTabs, label } = useActiveTab()

  if (!active) {
    return (
      <>
        <Toolbar />
        <LanguageServerNotice />
        <TabContent tabbed={hasTabs} label={label}>
          <DiffViewer />
        </TabContent>
      </>
    )
  }
  if (view === 'diff') {
    return (
      <TabContent tabbed={hasTabs} label={label}>
        <DiffTabView key={active.id} tab={active} />
      </TabContent>
    )
  }
  return (
    <>
      <ReadOnlyFileNotice tab={active} />
      <TabContent tabbed={hasTabs} label={label}>
        <FileTabView key={active.id} tab={active} />
      </TabContent>
    </>
  )
}
