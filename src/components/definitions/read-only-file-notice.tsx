import { VscLock } from 'react-icons/vsc'
import { DefinitionLabels } from '@/src/lib/definition-labels.ts'
import type { DefinitionTab } from '@/src/lib/definition-tabs.ts'
import { NoticeBar } from '@/src/primitives/notice-bar.tsx'

export function ReadOnlyFileNotice({ tab }: { tab: DefinitionTab }) {
  return (
    <NoticeBar
      tone={'neutral'}
      icon={<VscLock />}
      title={DefinitionLabels.readOnly(tab)}
      detail={tab.path}
      detailTruncation={'start'}
    />
  )
}
