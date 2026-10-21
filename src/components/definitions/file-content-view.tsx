import { File as PierreFile } from '@pierre/diffs/react'
import { useFileContentView } from '@/src/hooks/use-file-content-view.ts'
import type { DefinitionTab } from '@/src/lib/definition-tabs.ts'
import { DiffSurface } from '@/src/lib/diff-surface.ts'
import type { FileContent } from '@/src/lib/file-content-gateway.ts'
import { LoadingBar } from '@/src/primitives/loading-bar.tsx'
import { DefinitionPopover } from '@/src/components/definitions/definition-popover.tsx'

interface FileContentViewProps {
  tab: DefinitionTab
  content: FileContent
}

export function FileContentView({ tab, content }: FileContentViewProps) {
  const view = useFileContentView(tab, content)

  return (
    <>
      {view.revealing && <LoadingBar />}
      <PierreFile
        file={view.file}
        options={view.options}
        metrics={view.metrics}
        style={DiffSurface.style}
        className={'block'}
      />
      <DefinitionPopover {...view.definition} />
    </>
  )
}
