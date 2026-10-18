import { useMediaQuery } from '@uidotdev/usehooks'

export const useReducedMotion = () => {
  return useMediaQuery('(prefers-reduced-motion: reduce)')
}
