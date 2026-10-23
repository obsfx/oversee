import type { CallFlowNode } from '@/src/lib/call-flow.ts'
import type { CallFlowIndex } from '@/src/lib/call-flow-tree.ts'

export abstract class CallFlowGraphSearch {
  static closure(starts: Iterable<string>, next: (id: string) => Iterable<string>) {
    const seen = new Set<string>()
    const queue = [...starts]
    while (queue.length > 0) {
      const id = queue.pop()
      if (id === undefined || seen.has(id)) {
        continue
      }
      seen.add(id)
      for (const following of next(id)) {
        queue.push(following)
      }
    }
    return seen
  }

  static components(index: CallFlowIndex, nodes: readonly CallFlowNode[]) {
    const inside = new Set(
      nodes.map((node) => {
        return node.id
      }),
    )
    const order = new Map<string, number>()
    const low = new Map<string, number>()
    const open: string[] = []
    const onOpen = new Set<string>()
    const componentOf = new Map<string, string>()
    const enter = (id: string) => {
      low.set(id, order.size)
      order.set(id, order.size)
      open.push(id)
      onOpen.add(id)
    }
    for (const start of nodes) {
      if (order.has(start.id)) {
        continue
      }
      enter(start.id)
      const frames = [{ id: start.id, next: 0 }]
      while (frames.length > 0) {
        const frame = frames[frames.length - 1]
        const calls = index.outgoing.get(frame.id) ?? []
        if (frame.next < calls.length) {
          const to = calls[frame.next].to
          frame.next += 1
          if (!inside.has(to)) {
            continue
          }
          if (!order.has(to)) {
            enter(to)
            frames.push({ id: to, next: 0 })
          } else if (onOpen.has(to)) {
            low.set(frame.id, Math.min(low.get(frame.id) ?? 0, order.get(to) ?? 0))
          }
          continue
        }
        frames.pop()
        const lowest = low.get(frame.id) ?? 0
        const caller = frames.at(-1)
        if (caller !== undefined) {
          low.set(caller.id, Math.min(low.get(caller.id) ?? 0, lowest))
        }
        if (lowest !== order.get(frame.id)) {
          continue
        }
        let member: string | undefined
        while (member !== frame.id) {
          member = open.pop()
          if (member === undefined) {
            break
          }
          onOpen.delete(member)
          componentOf.set(member, frame.id)
        }
      }
    }
    return componentOf
  }
}
