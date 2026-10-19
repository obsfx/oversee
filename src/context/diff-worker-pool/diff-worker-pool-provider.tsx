import { WorkerPoolContextProvider, type WorkerPoolOptions } from '@pierre/diffs/react'
import DiffsWorker from '@pierre/diffs/worker/worker.js?worker&inline'
import { useState, type ReactNode } from 'react'
import { DiffThemeSync } from '@/src/components/diff-viewer/diff-theme-sync.tsx'
import { DiffThemeCatalog } from '@/src/lib/diff-theme-catalog.ts'
import { useSettingsStore } from '@/src/store/settings-store.ts'

const POOL_OPTIONS: WorkerPoolOptions = {
  poolSize: 2,
  workerFactory: () => {
    return new DiffsWorker()
  },
}

interface DiffWorkerPoolProviderProps {
  children: ReactNode
}

export function DiffWorkerPoolProvider({ children }: DiffWorkerPoolProviderProps) {
  const [highlighterOptions] = useState(() => {
    return { theme: DiffThemeCatalog.themes(useSettingsStore.getState().diffTheme) }
  })

  return (
    <WorkerPoolContextProvider poolOptions={POOL_OPTIONS} highlighterOptions={highlighterOptions}>
      <DiffThemeSync />
      {children}
    </WorkerPoolContextProvider>
  )
}
