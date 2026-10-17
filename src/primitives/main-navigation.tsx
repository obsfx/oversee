import { ExpandSidebarButton } from '../components/expand-sidebar-button.tsx'
import { BranchSelection } from '../components/branch-selection.tsx'
import { BsArrowRightShort } from 'react-icons/bs'

export function MainNavigation() {
  return (
    <div className={'flex h-9 w-full items-stretch justify-between bg-gray-50 px-2'}>
      <div className={'flex w-full items-center justify-between'}>
        <div>
          <ExpandSidebarButton />
        </div>
        <div className={'flex items-center gap-0.5'}>
          <BranchSelection />
          <BsArrowRightShort className={'text-lg text-gray-500'} />
          <BranchSelection />
        </div>
      </div>
    </div>
  )
}
