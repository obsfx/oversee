import type { ReactNode } from 'react'
import { VscCheck, VscError, VscGoToFile, VscWarning } from 'react-icons/vsc'
import { useLanguageServerNotice } from '@/src/hooks/use-language-server-notice.ts'
import type { LanguageServerNoticeKind } from '@/src/lib/language-server-notices.ts'
import { NoticeBar, type NoticeTone } from '@/src/primitives/notice-bar.tsx'
import { ProgressBar } from '@/src/primitives/progress-bar.tsx'
import { TextButton } from '@/src/primitives/text-button.tsx'
import { ErrorDetails } from '@/src/components/error-details.tsx'

const TONES: Record<LanguageServerNoticeKind, NoticeTone> = {
  offer: 'accent',
  blocked: 'warning',
  installing: 'accent',
  failed: 'danger',
  ready: 'success',
}

const ICONS: Record<LanguageServerNoticeKind, ReactNode> = {
  offer: <VscGoToFile />,
  blocked: <VscWarning />,
  installing: <VscGoToFile />,
  failed: <VscError />,
  ready: <VscCheck />,
}

export function LanguageServerNotice() {
  const notice = useLanguageServerNotice()

  if (!notice) {
    return null
  }
  const installing = notice.kind === 'installing'
  let progress = null
  if (installing) {
    progress = <ProgressBar label={notice.title} ratio={notice.progress} />
  }
  return (
    <NoticeBar
      tone={TONES[notice.kind]}
      icon={ICONS[notice.kind]}
      title={notice.title}
      detail={notice.detail}
      busy={installing}
      progress={progress}
    >
      {notice.kind === 'offer' && (
        <>
          <TextButton onClick={notice.install}>Install</TextButton>
          <TextButton onClick={notice.dismiss}>Not now</TextButton>
        </>
      )}
      {installing && <TextButton onClick={notice.cancel}>Cancel</TextButton>}
      {notice.kind === 'failed' && (
        <>
          <ErrorDetails error={notice.error} />
          <TextButton onClick={notice.install}>Retry</TextButton>
          <TextButton onClick={notice.dismiss}>Not now</TextButton>
        </>
      )}
      {notice.kind === 'blocked' && <TextButton onClick={notice.dismiss}>Dismiss</TextButton>}
    </NoticeBar>
  )
}
