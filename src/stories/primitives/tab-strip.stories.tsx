import type { Meta, StoryObj } from '@storybook/react-vite'
import { VscChevronDown, VscDiff, VscDiffMultiple, VscFile, VscLibrary } from 'react-icons/vsc'
import { fn } from 'storybook/test'
import { IconButton } from '@/src/primitives/icon-button.tsx'
import { ScrollButtons } from '@/src/primitives/scroll-buttons.tsx'
import { TabItem } from '@/src/primitives/tab-item.tsx'
import { TabStrip } from '@/src/primitives/tab-strip.tsx'

const fileTab = (name: string, active = false) => {
  return (
    <TabItem
      key={name}
      active={active}
      icon={<VscFile />}
      title={name}
      italic
      closeLabel={`Close ${name}`}
      onSelect={fn()}
      onClose={fn()}
    />
  )
}

const meta = {
  title: 'Primitives/TabStrip',
  component: TabStrip,
  args: {
    label: 'Open files',
    pinned: <TabItem active={false} icon={<VscDiffMultiple />} title={'Review'} onSelect={fn()} />,
    children: (
      <>
        <TabItem
          active={false}
          icon={<VscDiff className={'text-status-modified'} />}
          title={'expire_password.ts'}
          closeLabel={'Close expire_password.ts'}
          onSelect={fn()}
          onClose={fn()}
        />
        {fileTab('session.repository.ts', true)}
        <TabItem
          active={false}
          icon={<VscLibrary />}
          title={'lib.es5.d.ts'}
          italic
          closeLabel={'Close lib.es5.d.ts'}
          onSelect={fn()}
          onClose={fn()}
        />
      </>
    ),
  },
  decorators: [
    (Story) => {
      return (
        <div className={'w-[40rem]'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof TabStrip>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Overflowing: Story = {
  args: {
    fadeMask:
      'linear-gradient(to right, transparent 0, black 1.5rem, black calc(100% - 1.5rem), transparent 100%)',
    controls: (
      <>
        <ScrollButtons
          previousLabel={'Scroll tabs left'}
          nextLabel={'Scroll tabs right'}
          canPrevious
          canNext
          onPrevious={fn()}
          onNext={fn()}
        />
        <IconButton aria-label={'All open files'}>
          <VscChevronDown />
        </IconButton>
      </>
    ),
    children: [
      'context.ts',
      'role.ts',
      'billing.service.ts',
      'users.repository.ts',
      'session.service.ts',
      'customClaims.ts',
      'database.ts',
      'typings.d.ts',
    ].map((name, index) => {
      return fileTab(name, index === 4)
    }),
  },
}
