import type { FaviconFrame } from '@/src/lib/favicon-frames.ts'

interface BlinkStep {
  frame: FaviconFrame
  ms: number
}

const VISIBLE_BLINK: BlinkStep[] = [
  { frame: 'half', ms: 50 },
  { frame: 'closed', ms: 90 },
  { frame: 'half', ms: 50 },
  { frame: 'open', ms: 160 },
]
const HIDDEN_TAB_BLINK: BlinkStep[] = [
  { frame: 'closed', ms: 1000 },
  { frame: 'open', ms: 1000 },
]

export class FaviconBlinker {
  private readonly render: (frame: FaviconFrame) => void
  private readonly timers = new Set<ReturnType<typeof setTimeout>>()

  constructor(render: (frame: FaviconFrame) => void) {
    this.render = render
  }

  blink(times: number, hiddenTab: boolean) {
    this.stop()
    const blink = hiddenTab ? HIDDEN_TAB_BLINK : VISIBLE_BLINK
    const steps: BlinkStep[] = []
    for (let index = 0; index < times; index += 1) {
      steps.push(...blink)
    }
    this.play(steps)
  }

  stop() {
    for (const timer of this.timers) {
      clearTimeout(timer)
    }
    this.timers.clear()
    this.render('open')
  }

  private play(steps: BlinkStep[]) {
    const [step, ...rest] = steps
    if (!step) {
      return
    }
    this.render(step.frame)
    this.schedule(step.ms, () => {
      this.play(rest)
    })
  }

  private schedule(delay: number, run: () => void) {
    const timer = setTimeout(() => {
      this.timers.delete(timer)
      run()
    }, delay)
    this.timers.add(timer)
  }
}
