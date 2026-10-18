import { CenteredStatus } from '../../primitives/centered-status.tsx'
import { Spinner } from '../../primitives/spinner.tsx'

export function SidebarLoading() {
  return (
    <div aria-busy className={'h-full'}>
      <CenteredStatus icon={<Spinner />}>Loading files</CenteredStatus>
    </div>
  )
}
