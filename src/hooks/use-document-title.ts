import { useEffect } from 'react'
import { useWorkspace } from '@/src/hooks/use-workspace.ts'
import { WorkspaceLabels } from '@/src/lib/workspace-labels.ts'

export const useDocumentTitle = () => {
  const workspace = useWorkspace()
  const title = WorkspaceLabels.documentTitle(workspace)

  useEffect(() => {
    document.title = title
  }, [title])
}
