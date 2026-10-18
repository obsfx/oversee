import { useFileNavigation } from '../../hooks/use-file-navigation.ts'
import { ToolbarDivider } from '../../primitives/toolbar-divider.tsx'
import { ToolbarGroup } from '../../primitives/toolbar-group.tsx'
import { ToolbarShell } from '../../primitives/toolbar-shell.tsx'
import { FileNavigator } from './file-navigator.tsx'
import { FileSummary } from './file-summary.tsx'
import { ReviewedToggle } from './reviewed-toggle.tsx'
import { UnchangedToggle } from './unchanged-toggle.tsx'
import { ViewModeToggle } from './view-mode-toggle.tsx'

export function Toolbar() {
  const navigation = useFileNavigation()
  const file = navigation.current
  if (!file) {
    return null
  }

  return (
    <ToolbarShell>
      <ToolbarGroup grow>
        <UnchangedToggle />
        <FileSummary file={file} />
      </ToolbarGroup>
      <ToolbarGroup>
        <FileNavigator
          position={navigation.position}
          total={navigation.total}
          percent={navigation.percent}
          canPrevious={navigation.canPrevious}
          canNext={navigation.canNext}
          onPrevious={navigation.previous}
          onNext={navigation.next}
        />
        <ToolbarDivider />
        <ViewModeToggle />
        <ReviewedToggle path={file.path} />
      </ToolbarGroup>
    </ToolbarShell>
  )
}
