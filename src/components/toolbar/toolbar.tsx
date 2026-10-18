import { useFileNavigation } from '@/src/hooks/use-file-navigation.ts'
import { ToolbarDivider } from '@/src/primitives/toolbar-divider.tsx'
import { ToolbarGroup } from '@/src/primitives/toolbar-group.tsx'
import { ToolbarShell } from '@/src/primitives/toolbar-shell.tsx'
import { FileNavigator } from '@/src/components/toolbar/file-navigator.tsx'
import { FileSummary } from '@/src/components/toolbar/file-summary.tsx'
import { ReviewedToggle } from '@/src/components/toolbar/reviewed-toggle.tsx'
import { UnchangedToggle } from '@/src/components/toolbar/unchanged-toggle.tsx'
import { ViewModeToggle } from '@/src/components/toolbar/view-mode-toggle.tsx'

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
