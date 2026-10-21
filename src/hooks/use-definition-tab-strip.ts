import type { KeyboardEvent } from 'react'
import { useTabStripOverflow } from '@/src/hooks/use-tab-strip-overflow.ts'
import { useTabView } from '@/src/hooks/use-tab-view.ts'
import { DefinitionLabels } from '@/src/lib/definition-labels.ts'
import { DefinitionTabs } from '@/src/lib/definition-tabs.ts'
import { PathParts } from '@/src/lib/path-parts.ts'
import { TabKeys } from '@/src/lib/tab-keys.ts'
import { useTabStore } from '@/src/store/tab-store.ts'

export type DefinitionTabIcon = 'diff' | 'file' | 'external'

export const useDefinitionTabStrip = () => {
  const tabs = useTabStore((state) => {
    return state.tabs
  })
  const activeId = useTabStore((state) => {
    return state.activeId
  })
  const activate = useTabStore((state) => {
    return state.activate
  })
  const close = useTabStore((state) => {
    return state.close
  })
  const viewOf = useTabView()
  const overflow = useTabStripOverflow(DefinitionTabs.revealKey({ tabs, activeId }), tabs.length)
  const titles = DefinitionLabels.tabTitles(tabs)
  const order = [
    DefinitionTabs.reviewId,
    ...tabs.map((tab) => {
      return tab.id
    }),
  ]

  return {
    attachScroller: overflow.attachScroller,
    fadeMask: overflow.fadeMask,
    overflowing: overflow.overflowing,
    canScrollStart: overflow.edges.start,
    canScrollEnd: overflow.edges.end,
    scrollStart: () => {
      overflow.page(-1)
    },
    scrollEnd: () => {
      overflow.page(1)
    },
    reviewActive: activeId === DefinitionTabs.reviewId,
    showReview: () => {
      activate(DefinitionTabs.reviewId)
    },
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      const list = event.currentTarget
      if (TabKeys.closes(event.key) && activeId !== DefinitionTabs.reviewId) {
        event.preventDefault()
        close(activeId)
        requestAnimationFrame(() => {
          list.querySelector<HTMLElement>('[role=tab][aria-selected=true]')?.focus()
        })
        return
      }
      const next = TabKeys.next(event.key, order.indexOf(activeId), order.length)
      if (next === null) {
        return
      }
      event.preventDefault()
      activate(order[next])
      list.querySelectorAll<HTMLElement>('[role=tab]').item(next).focus()
    },
    tabs: tabs.map((tab) => {
      const view = viewOf(tab)
      let icon: DefinitionTabIcon = view
      if (tab.external) {
        icon = 'external'
      }
      const title = titles.get(tab.id)
      return {
        id: tab.id,
        icon,
        title: title?.head ?? DefinitionLabels.tabTitle(tab),
        label: title?.label ?? DefinitionLabels.tabTitle(tab),
        titleTail: title?.tail ?? '',
        hint: title?.hint ?? '',
        name: PathParts.name(tab.path),
        directory: PathParts.directory(tab.path),
        path: tab.path,
        readOnly: view === 'file',
        active: tab.id === activeId,
        closeLabel: DefinitionLabels.closeTab(tab),
        select: () => {
          activate(tab.id)
        },
        close: () => {
          close(tab.id)
        },
      }
    }),
  }
}
