import { VscGitCompare } from 'react-icons/vsc'
import { ChipButton } from '@/src/primitives/chip-button.tsx'
import { Spinner } from '@/src/primitives/spinner.tsx'

export function ComparisonPickerLoading() {
  return (
    <ChipButton disabled aria-busy>
      <VscGitCompare className={'shrink-0'} />
      <span className={'truncate'}>Loading branches</span>
      <Spinner />
    </ChipButton>
  )
}
