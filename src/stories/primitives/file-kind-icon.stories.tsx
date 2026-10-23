import type { Meta, StoryObj } from '@storybook/react-vite'
import type { FileKind } from '@/src/lib/file-kinds.ts'
import { FileKindIcon } from '@/src/primitives/file-kind-icon.tsx'

const KINDS: FileKind[] = [
  'typescript',
  'react',
  'javascript',
  'go',
  'gdscript',
  'godot',
  'json',
  'markdown',
  'css',
  'html',
  'yaml',
  'graphql',
  'sql',
  'image',
  'video',
  'env',
  'git',
  'text',
  'default',
]

const meta = {
  title: 'Primitives/FileKindIcon',
  component: FileKindIcon,
  args: { kind: 'typescript' },
  argTypes: { kind: { control: 'select', options: KINDS } },
  decorators: [
    (Story) => {
      return (
        <div className={'inline-flex bg-sidebar p-2 text-xs'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof FileKindIcon>

export default meta

type Story = StoryObj<typeof meta>

export const TypeScript: Story = {}

export const Tsx: Story = { args: { kind: 'react' } }

export const Yaml: Story = { args: { kind: 'yaml' } }

export const Go: Story = { args: { kind: 'go' } }

export const Gdscript: Story = { args: { kind: 'gdscript' } }

export const UnknownKind: Story = { args: { kind: 'default' } }

export const AllKinds: Story = {
  render: () => {
    return (
      <div className={'flex gap-1.5'}>
        {KINDS.map((kind) => {
          return <FileKindIcon key={kind} kind={kind} />
        })}
      </div>
    )
  },
}
