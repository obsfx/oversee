import { WorkerPoolContextProvider, type WorkerPoolOptions } from '@pierre/diffs/react'
import DiffsWorker from '@pierre/diffs/worker/worker.js?worker'
import type { ReactNode } from 'react'
import { DiffSurface } from '@/src/lib/diff-surface.ts'

const POOL_OPTIONS: WorkerPoolOptions = {
  poolSize: 2,
  workerFactory: () => {
    return new DiffsWorker()
  },
}

const HIGHLIGHTER_OPTIONS = { theme: DiffSurface.themes }

interface DiffWorkerPoolProviderProps {
  children: ReactNode
}

export function DiffWorkerPoolProvider({ children }: DiffWorkerPoolProviderProps) {
  return (
    <WorkerPoolContextProvider poolOptions={POOL_OPTIONS} highlighterOptions={HIGHLIGHTER_OPTIONS}>
      {children}
    </WorkerPoolContextProvider>
  )
}
