import { VscCircleSlash } from 'react-icons/vsc'
import { useFileContent } from '@/src/hooks/use-file-content.ts'
import type { DefinitionTab } from '@/src/lib/definition-tabs.ts'
import { DiffPlaceholder } from '@/src/primitives/diff-placeholder.tsx'
import { FileContentView } from '@/src/components/definitions/file-content-view.tsx'
import { ReadOnlyFileNotice } from '@/src/components/definitions/read-only-file-notice.tsx'
import { TabResourceView } from '@/src/components/definitions/tab-resource-view.tsx'

export function FileTabView({ tab }: { tab: DefinitionTab }) {
  const { state, missing, retry } = useFileContent(tab)

  if (missing) {
    return (
      <DiffPlaceholder icon={<VscCircleSlash />} title={missing.title} detail={missing.detail} />
    )
  }
  return (
    <div className={'flex h-full flex-col'}>
      <ReadOnlyFileNotice tab={tab} />
      <div className={'min-h-0 flex-1'}>
        <TabResourceView state={state} failure={'Could not read this file'} onRetry={retry}>
          {(content) => {
            return <FileContentView tab={tab} content={content} />
          }}
        </TabResourceView>
      </div>
    </div>
  )
}
