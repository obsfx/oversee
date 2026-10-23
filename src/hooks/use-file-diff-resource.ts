import { useServices } from '@/src/context/services/use-services.ts'
import { useChangeSet } from '@/src/hooks/use-change-set.ts'
import { useComparison } from '@/src/hooks/use-comparison.ts'
import { useResource } from '@/src/hooks/use-resource.ts'
import { ChangeSets } from '@/src/lib/change-set.ts'

export const useFileDiffResource = (path: string | null) => {
  const { fileDiffs } = useServices()
  const { comparison } = useComparison()
  const changeSet = useChangeSet()
  const change = ChangeSets.find(ChangeSets.changesOf(changeSet.state), path)
  const resource = comparison && change ? fileDiffs.get({ comparison, change }) : null
  const state = useResource(resource)

  return { comparison, changeSet, change, resource, state }
}
