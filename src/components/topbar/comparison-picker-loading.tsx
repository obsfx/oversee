import { VscGitCompare } from 'react-icons/vsc'
import { ChipButton } from '../../primitives/chip-button.tsx'
import { Spinner } from '../../primitives/spinner.tsx'

export function ComparisonPickerLoading() {
  return (
    <ChipButton disabled aria-busy>
      <VscGitCompare className={'shrink-0'} />
      <span className={'truncate'}>Loading branches</span>
      <Spinner />
    </ChipButton>
  )
}
