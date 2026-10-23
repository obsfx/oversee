import type { ReactNode } from 'react'
import { VscCloudDownload, VscError, VscInfo, VscSourceControl, VscWarning } from 'react-icons/vsc'
import type { FlowServerNoticeModel } from '@/src/hooks/use-flow-server-notices.ts'
import { type FlowServerNoticeKind, FlowServerNotices } from '@/src/lib/flow-server-notices.ts'
import type { NoticeTone } from '@/src/lib/notice-tones.ts'
import { ProgressBar } from '@/src/primitives/progress-bar.tsx'
import { SidebarNotice } from '@/src/primitives/sidebar-notice.tsx'
import { Spinner } from '@/src/primitives/spinner.tsx'
import { TextButton } from '@/src/primitives/text-button.tsx'
import { ErrorDetails } from '@/src/components/error-details.tsx'

const TONES: Record<FlowServerNoticeKind, NoticeTone> = {
  offer: 'accent',
  blocked: 'warning',
  installing: 'accent',
  'install-failed': 'danger',
  'needs-checkout': 'neutral',
  starting: 'neutral',
  indexing: 'neutral',
  failed: 'danger',
  unsupported: 'neutral',
}

const ICONS: Record<FlowServerNoticeKind, ReactNode> = {
  offer: <VscCloudDownload />,
  blocked: <VscWarning />,
  installing: <VscCloudDownload />,
  'install-failed': <VscError />,
  'needs-checkout': <VscSourceControl />,
  starting: <Spinner />,
  indexing: <Spinner />,
  failed: <VscError />,
  unsupported: <VscInfo />,
}

export function FlowServerNoticeList({ notices }: { notices: readonly FlowServerNoticeModel[] }) {
  if (notices.length === 0) {
    return null
  }
  return (
    <div className={'max-h-2/5 shrink-0 overflow-y-auto'}>
      {notices.map((model) => {
        const { kind, key, error } = model.notice
        const { actions } = model
        let progress = null
        if (kind === 'installing') {
          progress = <ProgressBar label={model.title} ratio={model.progress} />
        }
        let buttons = null
        if (FlowServerNotices.hasActions(actions)) {
          buttons = (
            <>
              {actions.install && <TextButton onClick={model.install}>Install</TextButton>}
              {actions.cancel && <TextButton onClick={model.cancel}>Cancel</TextButton>}
              {actions.details && <ErrorDetails error={error} />}
              {actions.retryInstall && <TextButton onClick={model.install}>Retry</TextButton>}
              {actions.retry && <TextButton onClick={model.retry}>Retry</TextButton>}
            </>
          )
        }
        return (
          <SidebarNotice
            key={key}
            tone={TONES[kind]}
            icon={ICONS[kind]}
            title={model.title}
            detail={model.detail}
            busy={model.busy}
            progress={progress}
          >
            {buttons}
          </SidebarNotice>
        )
      })}
    </div>
  )
}
