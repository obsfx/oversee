import { VscCheckAll } from 'react-icons/vsc'
import { CenteredStatus } from '@/src/primitives/centered-status.tsx'

export function SidebarEmpty({ label }: { label: string }) {
  return <CenteredStatus icon={<VscCheckAll />}>{label}</CenteredStatus>
}
