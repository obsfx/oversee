import { ProgressBar } from '@/src/primitives/progress-bar.tsx'

export function LoadingBar() {
  return <ProgressBar label={'Loading'} ratio={null} className={'absolute inset-x-0 top-0 z-20'} />
}
