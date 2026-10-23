import { CenteredStatus } from '@/src/primitives/centered-status.tsx'
import { Spinner } from '@/src/primitives/spinner.tsx'

export function SidebarLoading({ label }: { label: string }) {
  return (
    <div aria-busy className={'h-full'}>
      <CenteredStatus icon={<Spinner />}>{label}</CenteredStatus>
    </div>
  )
}
