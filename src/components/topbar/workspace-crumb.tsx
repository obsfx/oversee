import { useWorkspace } from '@/src/hooks/use-workspace.ts'
import { CrumbSeparator } from '@/src/primitives/crumb-separator.tsx'
import { Tooltip } from '@/src/primitives/tooltip.tsx'
import { WorkspaceLabel } from '@/src/primitives/workspace-label.tsx'

export function WorkspaceCrumb() {
  const workspace = useWorkspace()
  if (!workspace) {
    return null
  }

  return (
    <>
      <Tooltip label={workspace.path}>
        <WorkspaceLabel
          name={workspace.name}
          repoName={workspace.repoName}
          tabIndex={0}
          aria-label={`Workspace ${workspace.path}`}
        />
      </Tooltip>
      <CrumbSeparator />
    </>
  )
}
