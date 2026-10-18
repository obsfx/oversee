import { useServices } from '@/src/context/services/use-services.ts'
import { useResource } from '@/src/hooks/use-resource.ts'

export const useReviewSession = (id: string) => {
  const { sessions } = useServices()
  return useResource(sessions.session(id))
}
