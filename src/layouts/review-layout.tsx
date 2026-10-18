import { Topbar } from '../components/topbar/topbar.tsx'

export function ReviewLayout() {
  return (
    <div className={'flex h-screen flex-col overflow-hidden bg-surface text-fg'}>
      <Topbar />
      <main className={'min-h-0 flex-1'} />
    </div>
  )
}
