import { VscWarning } from 'react-icons/vsc'
import { useDeletedBranchNotice } from '@/src/hooks/use-deleted-branch-notice.ts'
import { NoticeBar } from '@/src/primitives/notice-bar.tsx'
import { TextButton } from '@/src/primitives/text-button.tsx'

export function DeletedBranchNotice() {
  const notice = useDeletedBranchNotice()

  if (!notice) {
    return null
  }
  return (
    <NoticeBar tone={'warning'} icon={<VscWarning />} title={notice.title} detail={notice.detail}>
      <TextButton onClick={notice.dismiss}>Dismiss</TextButton>
    </NoticeBar>
  )
}
