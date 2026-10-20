import { DeletedBranchNotice } from '@/src/components/deleted-branch-notice.tsx'
import { DiffViewer } from '@/src/components/diff-viewer/diff-viewer.tsx'
import { LanguageServerNotice } from '@/src/components/language-server-notice.tsx'
import { Toolbar } from '@/src/components/toolbar/toolbar.tsx'
import { Topbar } from '@/src/components/topbar/topbar.tsx'

export function ReviewMain() {
  return (
    <div className={'flex h-full min-w-0 flex-col'}>
      <Topbar />
      <DeletedBranchNotice />
      <Toolbar />
      <LanguageServerNotice />
      <main className={'min-h-0 flex-1'}>
        <DiffViewer />
      </main>
    </div>
  )
}
