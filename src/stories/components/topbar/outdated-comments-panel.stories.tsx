import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { OutdatedCommentsPanel } from '@/src/components/topbar/outdated-comments-panel.tsx'
import type { Services } from '@/src/lib/services.ts'
import { createStoryServices, reviewCommentsWithOutdated } from '@/src/stories/support/fixtures.ts'
import { StoryFrame } from '@/src/stories/support/story-frame.tsx'

const meta = {
  title: 'Components/Topbar/OutdatedCommentsPanel',
  component: OutdatedCommentsPanel,
  args: {
    services: createStoryServices({ comments: reviewCommentsWithOutdated }),
    onBack: fn(),
    onNavigate: fn(),
  },
  argTypes: { services: { table: { disable: true } } },
  render: ({ services, onBack, onNavigate }) => {
    return (
      <StoryFrame services={services}>
        <div className={'w-[26rem] rounded-md border border-line bg-popup'}>
          <OutdatedCommentsPanel onBack={onBack} onNavigate={onNavigate} />
        </div>
      </StoryFrame>
    )
  },
} satisfies Meta<{ services: Services; onBack: () => void; onNavigate: () => void }>

export default meta

export const Default: StoryObj<typeof meta> = {}
