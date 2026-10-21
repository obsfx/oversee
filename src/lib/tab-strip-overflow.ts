interface StripEdges {
  start: boolean
  end: boolean
}

const FADE = '1.5rem'
const PAGE_RATIO = 0.8

export abstract class TabStripOverflow {
  static readonly none: StripEdges = { start: false, end: false }

  static edgesOf(scroller: HTMLElement): StripEdges {
    return {
      start: scroller.scrollLeft > 1,
      end: scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 1,
    }
  }

  static same(left: StripEdges, right: StripEdges) {
    return left.start === right.start && left.end === right.end
  }

  static fadeMask({ start, end }: StripEdges) {
    if (!start && !end) {
      return undefined
    }
    let from = 'black 0'
    if (start) {
      from = `transparent 0, black ${FADE}`
    }
    let to = 'black 100%'
    if (end) {
      to = `black calc(100% - ${FADE}), transparent 100%`
    }
    return `linear-gradient(to right, ${from}, ${to})`
  }

  static wheelDelta(event: WheelEvent, scroller: HTMLElement) {
    const vertical = Math.abs(event.deltaY) > Math.abs(event.deltaX)
    if (!vertical || scroller.scrollWidth <= scroller.clientWidth) {
      return null
    }
    return event.deltaY
  }

  static pageOf(scroller: HTMLElement, direction: 1 | -1): ScrollToOptions {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    return {
      left: direction * scroller.clientWidth * PAGE_RATIO,
      behavior: reduced ? 'auto' : 'smooth',
    }
  }

  static revealActive(scroller: HTMLElement) {
    scroller
      .querySelector<HTMLElement>('[role=tab][aria-selected=true]')
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }
}
