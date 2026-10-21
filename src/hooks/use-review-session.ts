import { useServices } from '@/src/context/services/use-services.ts'
import type { ResourceState } from '@/src/lib/async-resource.ts'
import type { ReviewSession } from '@/src/lib/review-session-gateway.ts'
import { useResource } from '@/src/hooks/use-resource.ts'
import { useReviewSessions } from '@/src/hooks/use-review-sessions.ts'

export const useReviewSession = (id: string): ResourceState<ReviewSession> => {
  const { sessions } = useServices()
  const { list } = useReviewSessions()
  const listed = list.find((session) => {
    return session.id === id
  })
  const state = useResource(listed ? null : sessions.session(id))

  if (listed) {
    return { status: 'ready', data: listed }
  }
  return state
}
