import type { ReactNode } from 'react'
import type { ResourceState } from '@/src/lib/async-resource.ts'
import { LoadFailure } from '@/src/primitives/load-failure.tsx'
import { LoadingBar } from '@/src/primitives/loading-bar.tsx'
import { VirtualizedScroller } from '@/src/components/diff-viewer/virtualized-scroller.tsx'

interface TabResourceViewProps<T> {
  state: ResourceState<T>
  failure: string
  onRetry: () => void
  children: (data: T) => ReactNode
}

export function TabResourceView<T>({ state, failure, onRetry, children }: TabResourceViewProps<T>) {
  if (state.status === 'failed') {
    return <LoadFailure message={failure} onRetry={onRetry} />
  }
  return (
    <div className={'relative h-full'}>
      {state.status !== 'ready' && <LoadingBar />}
      {state.status === 'ready' && (
        <VirtualizedScroller className={'h-full overflow-auto'}>
          {children(state.data)}
        </VirtualizedScroller>
      )}
    </div>
  )
}
