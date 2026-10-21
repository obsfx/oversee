import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { OpenFilesPopover } from '@/src/components/definitions/open-files-popover.tsx'
import type { OpenFile } from '@/src/hooks/use-open-files-list.ts'
import { PathParts } from '@/src/lib/path-parts.ts'
import { stressDataset } from '@/src/stories/support/definition-stress-fixture.ts'
import { createStoryServices } from '@/src/stories/support/fixtures.ts'
import { StoryFrame } from '@/src/stories/support/story-frame.tsx'

const services = createStoryServices()

const filesOf = (paths: string[], activeIndex: number): OpenFile[] => {
  return paths.map((path, index) => {
    return {
      id: path,
      name: PathParts.name(path),
      directory: PathParts.directory(path),
      path,
      active: index === activeIndex,
      select: fn(),
    }
  })
}

const meta = {
  title: 'Components/Definitions/OpenFilesPopover',
  component: OpenFilesPopover,
  args: {
    files: filesOf(
      [
        'src/modules/billing/index.ts',
        'src/modules/users/index.ts',
        'src/stories/support/session.repository.ts',
        '/Users/dev/.nvm/versions/node/v22.11.0/lib/node_modules/typescript/lib/lib.es5.d.ts',
      ],
      2,
    ),
  },
  decorators: [
    (Story) => {
      return (
        <StoryFrame services={services}>
          <div className={'flex justify-end'}>
            <Story />
          </div>
        </StoryFrame>
      )
    },
  ],
} satisfies Meta<typeof OpenFilesPopover>

export default meta

type Story = StoryObj<typeof meta>

export const FewFiles: Story = {}

export const ManyFiles: Story = {
  args: {
    files: filesOf(
      stressDataset('many').tabs.map((tab) => {
        return tab.path
      }),
      39,
    ),
  },
}
