import type { Comparison } from '@/src/lib/comparison-rules.ts'
import type { FlowServerProgress } from '@/src/lib/flow-progress.ts'
import type { InMemoryEventStream } from '@/src/lib/in-memory-event-stream.ts'

export interface SimulatedServer {
  server: string
  startMs: number
  files: number
  readMs: number
  functions: number
  traceMs: number
}

export class FlowBuildSimulation {
  private static readonly tickMs = 250
  private static readonly groupMs = 600
  private readonly events: InMemoryEventStream
  private readonly servers: readonly SimulatedServer[]
  private running: Promise<void> | null = null
  private ended = false

  constructor(events: InMemoryEventStream, servers: readonly SimulatedServer[]) {
    this.events = events
    this.servers = servers
  }

  get finished() {
    return this.ended
  }

  run(comparison: Comparison) {
    if (this.running === null) {
      this.running = new Promise((resolve) => {
        this.tick(comparison, 0, resolve)
      })
    }
    return this.running
  }

  private tick(comparison: Comparison, elapsed: number, resolve: () => void) {
    const endMs = FlowBuildSimulation.groupMs + this.longestMs()
    this.emit(comparison, Math.min(elapsed, endMs))
    if (elapsed >= endMs) {
      this.ended = true
      resolve()
      return
    }
    setTimeout(() => {
      this.tick(comparison, elapsed + FlowBuildSimulation.tickMs, resolve)
    }, FlowBuildSimulation.tickMs)
  }

  private emit(comparison: Comparison, elapsed: number) {
    let servers: FlowServerProgress[] = []
    if (elapsed >= FlowBuildSimulation.groupMs) {
      servers = this.servers.map((server) => {
        return FlowBuildSimulation.serverAt(server, elapsed - FlowBuildSimulation.groupMs)
      })
    }
    this.events.emit({ kind: 'change-flow.progress', comparison, servers })
  }

  private longestMs() {
    return Math.max(
      ...this.servers.map(({ startMs, readMs, traceMs }) => {
        return startMs + readMs + traceMs
      }),
    )
  }

  private static serverAt(plan: SimulatedServer, elapsed: number): FlowServerProgress {
    const { server, startMs, files, readMs, functions, traceMs } = plan
    if (elapsed < startMs) {
      return { server, phase: 'starting', done: 0, total: 0 }
    }
    const reading = elapsed - startMs
    if (reading < readMs) {
      const done = Math.floor((files * reading) / readMs)
      return { server, phase: 'reading', done, total: files }
    }
    const tracing = reading - readMs
    if (tracing < traceMs) {
      const done = Math.floor((functions * tracing) / traceMs)
      return { server, phase: 'tracing', done, total: functions }
    }
    return { server, phase: 'done', done: functions, total: functions }
  }
}
