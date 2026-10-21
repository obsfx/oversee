import type { ReactNode } from 'react'
import { VscDiff, VscDiffMultiple, VscFile, VscLibrary } from 'react-icons/vsc'
import {
  type DefinitionTabIcon,
  useDefinitionTabStrip,
} from '@/src/hooks/use-definition-tab-strip.ts'
import { ScrollButtons } from '@/src/primitives/scroll-buttons.tsx'
import { TabItem } from '@/src/primitives/tab-item.tsx'
import { TabStrip } from '@/src/primitives/tab-strip.tsx'
import { OpenFilesPopover } from '@/src/components/definitions/open-files-popover.tsx'

const ICONS: Record<DefinitionTabIcon, ReactNode> = {
  diff: <VscDiff className={'text-status-modified'} />,
  file: <VscFile />,
  external: <VscLibrary />,
}

export function DefinitionTabStrip() {
  const { attachScroller, ...strip } = useDefinitionTabStrip()

  if (strip.tabs.length === 0) {
    return null
  }
  let controls: ReactNode = null
  if (strip.overflowing) {
    controls = (
      <>
        <ScrollButtons
          previousLabel={'Scroll tabs left'}
          nextLabel={'Scroll tabs right'}
          canPrevious={strip.canScrollStart}
          canNext={strip.canScrollEnd}
          onPrevious={strip.scrollStart}
          onNext={strip.scrollEnd}
        />
        <OpenFilesPopover files={strip.tabs} />
      </>
    )
  }
  return (
    <TabStrip
      label={'Open files'}
      scrollerRef={attachScroller}
      fadeMask={strip.fadeMask}
      controls={controls}
      onKeyDown={strip.onKeyDown}
      pinned={
        <TabItem
          active={strip.reviewActive}
          icon={<VscDiffMultiple />}
          title={'Review'}
          onSelect={strip.showReview}
        />
      }
    >
      {strip.tabs.map((tab) => {
        return (
          <TabItem
            key={tab.id}
            active={tab.active}
            icon={ICONS[tab.icon]}
            title={tab.title}
            label={tab.label}
            titleTail={tab.titleTail}
            hint={tab.hint}
            tooltip={tab.path}
            italic={tab.readOnly}
            closeLabel={tab.closeLabel}
            onSelect={tab.select}
            onClose={tab.close}
          />
        )
      })}
    </TabStrip>
  )
}
