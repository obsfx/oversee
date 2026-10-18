import { VscCheckAll } from 'react-icons/vsc'
import { CenteredStatus } from '@/src/primitives/centered-status.tsx'

export function SidebarEmpty() {
  return <CenteredStatus icon={<VscCheckAll />}>No changed files</CenteredStatus>
}
