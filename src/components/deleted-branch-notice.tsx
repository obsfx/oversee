import { VscWarning } from 'react-icons/vsc'
import { useDeletedBranchNotice } from '@/src/hooks/use-deleted-branch-notice.ts'
import { WarningBar } from '@/src/primitives/warning-bar.tsx'

export function DeletedBranchNotice() {
  const notice = useDeletedBranchNotice()

  if (!notice) {
    return null
  }
  return (
    <WarningBar
      icon={<VscWarning />}
      title={notice.title}
      detail={notice.detail}
      actionLabel={'Dismiss'}
      onAction={notice.dismiss}
    />
  )
}
