import { VscGitBranch } from 'react-icons/vsc'

export function BranchSelection() {
  return (
    <div
      className={
        'relative flex w-full max-w-36 items-center justify-center rounded-sm bg-gray-200 px-1 py-0.5 text-xs text-gray-800 hover:bg-gray-300'
      }
    >
      <div className={'absolute left-2'}>
        <VscGitBranch />
      </div>
      <select className={'flex w-[97%] cursor-pointer pl-3.5 text-ellipsis outline-0'}>
        <option value={'test'}>master</option>
        <option value={'test'}>feat/upgrade-deprecated-versions</option>
      </select>
    </div>
  )
}
