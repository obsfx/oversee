import { useStore } from 'zustand'
import { useServices } from '@/src/context/services/use-services.ts'
import { ChangeFlowProgress } from '@/src/lib/change-flow-progress.ts'
import type { Comparison } from '@/src/lib/comparison-rules.ts'

export const useFlowProgress = (comparison: Comparison | null) => {
  const { changeFlowProgress } = useServices()
  return useStore(changeFlowProgress.store, (entries) => {
    return ChangeFlowProgress.of(entries, comparison)
  })
}
