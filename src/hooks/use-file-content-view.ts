import type { FileContents, FileOptions } from '@pierre/diffs/react'
import { useCodeSurface } from '@/src/hooks/use-code-surface.ts'
import type { DefinitionTab } from '@/src/lib/definition-tabs.ts'
import { DiffLineReveal } from '@/src/lib/diff-line-reveal.ts'
import type { FileContent } from '@/src/lib/file-content-gateway.ts'

export const useFileContentView = (tab: DefinitionTab, content: FileContent) => {
  const lastLine = DiffLineReveal.lastLine(content.contents)
  const surface = useCodeSurface(tab.path, tab.reveal, { old: lastLine, new: lastLine })
  const options: FileOptions<undefined, undefined> = {
    ...surface.base,
    lineHoverHighlight: 'number',
    onPostRender: surface.onPostRender,
  }
  if (!tab.external) {
    options.onTokenEnter = surface.tokenHandlers.onTokenEnter
    options.onTokenLeave = surface.tokenHandlers.onTokenLeave
    options.onTokenClick = surface.tokenHandlers.onTokenClick
  }
  const file: FileContents = {
    name: content.path,
    contents: content.contents,
    cacheKey: content.cacheKey,
  }

  return {
    file,
    options,
    metrics: surface.metrics,
    revealing: surface.revealing,
    definition: surface.definition,
  }
}
