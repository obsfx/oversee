import { Popover } from '@base-ui/react/popover'
import { Tabs } from '@base-ui/react/tabs'
import { VscComment } from 'react-icons/vsc'
import { CurrentCommentsPanel } from '@/src/components/topbar/current-comments-panel.tsx'
import { ReviewSessionsPanel } from '@/src/components/topbar/review-sessions-panel.tsx'
import { useCommentsMenu } from '@/src/hooks/use-comments-menu.ts'
import { IconButton } from '@/src/primitives/icon-button.tsx'
import { PopoverSurface } from '@/src/primitives/popover-surface.tsx'
import { PopoverTab } from '@/src/primitives/popover-tab.tsx'
import { PopoverTabsHeader } from '@/src/primitives/popover-tabs-header.tsx'
import { Tooltip } from '@/src/primitives/tooltip.tsx'

export function CommentsMenu() {
  const menu = useCommentsMenu()

  return (
    <Popover.Root open={menu.open} onOpenChange={menu.setOpen}>
      <Tooltip label={menu.countLabel}>
        <Popover.Trigger render={<IconButton />} aria-label={menu.countLabel}>
          <VscComment />
          <span className={'text-xs tabular-nums'}>{menu.commentCount}</span>
        </Popover.Trigger>
      </Tooltip>
      <PopoverSurface align={'end'} className={'w-[26rem]'}>
        <Tabs.Root value={menu.tab} onValueChange={menu.selectTab}>
          <PopoverTabsHeader meta={menu.tab === 'current' ? menu.countLabel : 'Recorded reviews'}>
            <PopoverTab value={'current'} label={'Current'} count={menu.commentCount} />
            <PopoverTab value={'sessions'} label={'Sessions'} count={menu.sessionCount} />
          </PopoverTabsHeader>
          <Tabs.Panel value={'current'} className={'outline-none'}>
            <CurrentCommentsPanel onNavigate={menu.close} />
          </Tabs.Panel>
          <Tabs.Panel value={'sessions'} className={'outline-none'}>
            <ReviewSessionsPanel
              openedSession={menu.openedSession}
              onOpen={menu.openSession}
              onBack={menu.closeSession}
            />
          </Tabs.Panel>
        </Tabs.Root>
      </PopoverSurface>
    </Popover.Root>
  )
}
