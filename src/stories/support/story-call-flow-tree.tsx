import { CallFlowTreeView } from '@/src/components/sidebar/call-flow-tree-view.tsx'
import { useCallFlowTree } from '@/src/hooks/use-call-flow-tree.ts'
import type { CallFlowGraph } from '@/src/lib/call-flow.ts'

export function StoryCallFlowTree({ graph }: { graph: CallFlowGraph }) {
  const { attachScrollElement, ...tree } = useCallFlowTree(graph)
  return <CallFlowTreeView tree={tree} scroller={attachScrollElement} />
}
