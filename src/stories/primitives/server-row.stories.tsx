import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { Button } from '@/src/primitives/button.tsx'
import { ErrorLog } from '@/src/primitives/error-log.tsx'
import { ProgressBar } from '@/src/primitives/progress-bar.tsx'
import { RequirementList } from '@/src/primitives/requirement-list.tsx'
import { ServerRow } from '@/src/primitives/server-row.tsx'

const meta = {
  title: 'Primitives/ServerRow',
  component: ServerRow,
  args: {
    name: 'typescript-language-server',
    languages: 'TypeScript, JavaScript',
    status: '6.0.2 available',
    tone: 'muted',
    requirements: (
      <RequirementList
        items={[
          { tool: 'node', missing: false, title: 'node is on PATH' },
          { tool: 'npm', missing: false, title: 'npm is on PATH' },
        ]}
      />
    ),
    actions: (
      <Button variant={'surface'} onClick={fn()}>
        Install
      </Button>
    ),
  },
  decorators: [
    (Story) => {
      return (
        <div className={'w-80 text-xs'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof ServerRow>

export default meta

type Story = StoryObj<typeof meta>

export const Available: Story = {}

export const UpdateAvailable: Story = {
  args: {
    name: 'pyright',
    languages: 'Python',
    status: '1.1.400 installed, 1.1.414 available',
    tone: 'accent',
    actions: (
      <>
        <Button variant={'ghost'} onClick={fn()}>
          Remove
        </Button>
        <Button variant={'accent-subtle'} onClick={fn()}>
          Update
        </Button>
      </>
    ),
  },
}

export const Blocked: Story = {
  args: {
    name: 'jdtls',
    languages: 'Java',
    status: 'Needs java on PATH',
    tone: 'warning',
    requirements: (
      <RequirementList
        items={[
          { tool: 'java', missing: true, title: 'java is not on PATH' },
          { tool: 'python3', missing: false, title: 'python3 is on PATH' },
        ]}
      />
    ),
    actions: undefined,
  },
}

export const Installing: Story = {
  args: {
    status: '6.2 MB of 18.4 MB',
    actions: undefined,
    children: <ProgressBar label={'Installing'} ratio={0.34} className={'rounded-full'} />,
  },
}

export const Failed: Story = {
  args: {
    name: 'intelephense',
    languages: 'PHP',
    status: 'Install failed',
    tone: 'danger',
    children: <ErrorLog>{'checksum 3f1c does not match 9ab2'}</ErrorLog>,
  },
}
