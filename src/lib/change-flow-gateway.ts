import type { CallFlowGraph } from '@/src/lib/call-flow.ts'
import type { Comparison } from '@/src/lib/comparison-rules.ts'
import type { DefinitionStatus } from '@/src/lib/definition-gateway.ts'

export interface ChangeFlowServer {
  server: string
  status: DefinitionStatus
  error: string
}

export interface ChangeFlow {
  servers: ChangeFlowServer[]
  graph: CallFlowGraph
}

export interface ChangeFlowGateway {
  load(comparison: Comparison): Promise<ChangeFlow>
}
