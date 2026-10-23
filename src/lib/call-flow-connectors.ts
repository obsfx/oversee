import type { CallFlowConnector, CallFlowRow } from '@/src/lib/call-flow-tree.ts'

export abstract class CallFlowConnectors {
  static of(visible: readonly CallFlowRow[]) {
    const byKey = new Map(
      visible.map((row) => {
        return [row.key, row]
      }),
    )
    const lastChild = new Map<string | null, string>()
    for (const row of visible) {
      lastChild.set(row.parentKey, row.key)
    }
    const isLast = (row: CallFlowRow) => {
      return lastChild.get(row.parentKey) === row.key
    }
    const connectors = new Map<string, CallFlowConnector>()
    for (const row of visible) {
      const parent = row.parentKey === null ? undefined : byKey.get(row.parentKey)
      let continues: boolean[] = []
      if (parent !== undefined && parent.parentKey !== null) {
        continues = [...(connectors.get(parent.key)?.continues ?? []), !isLast(parent)]
      }
      connectors.set(row.key, { last: isLast(row), continues })
    }
    return connectors
  }
}
