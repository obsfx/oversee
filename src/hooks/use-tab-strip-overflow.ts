import { useEffect, useState } from 'react'
import { TabStripOverflow } from '@/src/lib/tab-strip-overflow.ts'

export const useTabStripOverflow = (revealKey: string, count: number) => {
  const [scroller, setScroller] = useState<HTMLElement | null>(null)
  const [edges, setEdges] = useState(TabStripOverflow.none)

  useEffect(() => {
    if (!scroller) {
      return
    }
    let width = scroller.clientWidth
    const update = () => {
      setEdges((current) => {
        const next = TabStripOverflow.edgesOf(scroller)
        return TabStripOverflow.same(current, next) ? current : next
      })
    }
    const observer = new ResizeObserver(() => {
      if (scroller.clientWidth !== width) {
        width = scroller.clientWidth
        TabStripOverflow.revealActive(scroller)
      }
      update()
    })
    observer.observe(scroller)
    for (const tab of scroller.children) {
      observer.observe(tab)
    }
    const onWheel = (event: WheelEvent) => {
      const delta = TabStripOverflow.wheelDelta(event, scroller)
      if (delta === null) {
        return
      }
      event.preventDefault()
      scroller.scrollLeft += delta
    }
    scroller.addEventListener('scroll', update, { passive: true })
    scroller.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      observer.disconnect()
      scroller.removeEventListener('scroll', update)
      scroller.removeEventListener('wheel', onWheel)
    }
  }, [scroller, count])

  useEffect(() => {
    if (scroller) {
      TabStripOverflow.revealActive(scroller)
    }
  }, [scroller, revealKey, count])

  return {
    attachScroller: setScroller,
    edges,
    overflowing: edges.start || edges.end,
    fadeMask: TabStripOverflow.fadeMask(edges),
    page: (direction: 1 | -1) => {
      scroller?.scrollBy(TabStripOverflow.pageOf(scroller, direction))
    },
  }
}
