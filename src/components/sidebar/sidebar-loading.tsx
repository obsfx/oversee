import { CenteredStatus } from '@/src/primitives/centered-status.tsx'
import { Spinner } from '@/src/primitives/spinner.tsx'

export function SidebarLoading() {
  return (
    <div aria-busy className={'h-full'}>
      <CenteredStatus icon={<Spinner />}>Loading files</CenteredStatus>
    </div>
  )
}
