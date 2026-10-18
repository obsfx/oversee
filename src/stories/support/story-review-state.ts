import { useAnnotationStore } from '@/src/store/annotation-store.ts'
import { useNavigationStore } from '@/src/store/navigation-store.ts'

export const STORY_PATH = 'src/graphql/resolvers/User/mutations/auth.ts'

export const resetReviewState = (selectedPath: string | null = STORY_PATH) => {
  useNavigationStore.setState({ selectedPath, focus: null })
  useAnnotationStore.setState({ selection: null, selecting: false, draft: null })
}
