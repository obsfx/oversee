import { Toolbar } from '../components/toolbar/toolbar.tsx'
import { Topbar } from '../components/topbar/topbar.tsx'

export function ReviewMain() {
  return (
    <div className={'flex h-full min-w-0 flex-col'}>
      <Topbar />
      <Toolbar />
      <main className={'min-h-0 flex-1'} />
    </div>
  )
}
