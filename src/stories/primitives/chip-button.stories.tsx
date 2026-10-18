import type { Meta, StoryObj } from '@storybook/react-vite'
import { VscArrowRight, VscGitCompare } from 'react-icons/vsc'
import { ChipButton } from '../../primitives/chip-button.tsx'

const meta = {
  title: 'Primitives/ChipButton',
  component: ChipButton,
  args: {
    children: (
      <>
        <VscGitCompare className={'text-fg-muted'} />
        <span className={'font-medium'}>feat/comment-threads</span>
        <VscArrowRight className={'text-fg-faint'} />
        <span className={'text-fg-muted'}>main</span>
      </>
    ),
  },
} satisfies Meta<typeof ChipButton>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Disabled: Story = { args: { disabled: true } }
