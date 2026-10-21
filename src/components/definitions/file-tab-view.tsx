import { useFileContent } from '@/src/hooks/use-file-content.ts'
import type { DefinitionTab } from '@/src/lib/definition-tabs.ts'
import { FileContentView } from '@/src/components/definitions/file-content-view.tsx'
import { TabResourceView } from '@/src/components/definitions/tab-resource-view.tsx'

export function FileTabView({ tab }: { tab: DefinitionTab }) {
  const { state, retry } = useFileContent(tab)

  return (
    <TabResourceView state={state} failure={'Could not read this file'} onRetry={retry}>
      {(content) => {
        return <FileContentView tab={tab} content={content} />
      }}
    </TabResourceView>
  )
}
