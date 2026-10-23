import * as v from 'valibot'
import type { Comparison } from '@/src/lib/comparison-rules.ts'
import { ValueSchemas } from '@/src/lib/value-schemas.ts'

const PHASES = ['starting', 'reading', 'tracing', 'done'] as const

export type FlowProgressPhase = (typeof PHASES)[number]

export interface FlowServerProgress {
  server: string
  phase: FlowProgressPhase
  done: number
  total: number
}

export interface FlowProgress {
  comparison: Comparison
  servers: FlowServerProgress[]
}

export interface FlowProgressLag {
  phase: Exclude<FlowProgressPhase, 'done'>
  servers: FlowServerProgress[]
  done: number
  total: number
}

const READING_SHARE = 0.3

export abstract class FlowProgressRules {
  static readonly server = v.object({
    server: v.string(),
    phase: v.picklist(PHASES),
    done: ValueSchemas.count,
    total: ValueSchemas.count,
  })

  static ratio(servers: readonly FlowServerProgress[]) {
    if (servers.length === 0) {
      return null
    }
    const sum = servers.reduce((total, server) => {
      return total + FlowProgressRules.serverRatio(server)
    }, 0)
    return sum / servers.length
  }

  static lagging(servers: readonly FlowServerProgress[]): FlowProgressLag | null {
    let lag: FlowProgressLag | null = null
    for (const server of servers) {
      if (server.phase === 'done') {
        continue
      }
      if (lag === null || PHASES.indexOf(server.phase) < PHASES.indexOf(lag.phase)) {
        lag = { phase: server.phase, servers: [], done: 0, total: 0 }
      }
      if (server.phase === lag.phase) {
        lag.servers.push(server)
        lag.done += Math.min(server.done, server.total)
        lag.total += server.total
      }
    }
    return lag
  }

  static readyCount(servers: readonly FlowServerProgress[]) {
    return servers.filter((server) => {
      return server.phase === 'done'
    }).length
  }

  private static serverRatio({ phase, done, total }: FlowServerProgress) {
    const fraction = total === 0 ? 0 : Math.min(done, total) / total
    switch (phase) {
      case 'starting': {
        return 0
      }
      case 'reading': {
        return READING_SHARE * fraction
      }
      case 'tracing': {
        return READING_SHARE + (1 - READING_SHARE) * fraction
      }
      case 'done': {
        return 1
      }
    }
  }
}
