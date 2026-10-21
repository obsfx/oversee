import { DefinitionTabStrip } from '@/src/components/definitions/definition-tab-strip.tsx'
import { TabPanel } from '@/src/components/definitions/tab-panel.tsx'
import { DeletedBranchNotice } from '@/src/components/deleted-branch-notice.tsx'
import { Topbar } from '@/src/components/topbar/topbar.tsx'

export function ReviewMain() {
  return (
    <div className={'flex h-full min-w-0 flex-col'}>
      <Topbar />
      <DeletedBranchNotice />
      <DefinitionTabStrip />
      <TabPanel />
    </div>
  )
}
