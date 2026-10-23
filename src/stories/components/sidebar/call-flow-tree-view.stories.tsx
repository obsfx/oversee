import type { Meta, StoryObj } from '@storybook/react-vite'
import { ChangeFlowFixtures } from '@/src/stories/support/change-flow-fixture.ts'
import { StoryCallFlowTree } from '@/src/stories/support/story-call-flow-tree.tsx'
import { StoryFrame } from '@/src/stories/support/story-frame.tsx'
import { useNavigationStore } from '@/src/store/navigation-store.ts'
import { useSymbolHighlightStore } from '@/src/store/symbol-highlight-store.ts'

const services = ChangeFlowFixtures.servicesOf(ChangeFlowFixtures.oversee)

const meta = {
  title: 'Components/Sidebar/CallFlowTreeView',
  component: StoryCallFlowTree,
  args: { graph: ChangeFlowFixtures.oversee.flow.graph },
  argTypes: { graph: { table: { disable: true } } },
  beforeEach: () => {
    useSymbolHighlightStore.getState().clear()
  },
  decorators: [
    (Story) => {
      return (
        <StoryFrame services={services}>
          <div className={'h-[32rem] w-80 bg-sidebar'}>
            <Story />
          </div>
        </StoryFrame>
      )
    },
  ],
} satisfies Meta<typeof StoryCallFlowTree>

export default meta

type Story = StoryObj<typeof meta>

export const Oversee: Story = {}

export const Godot: Story = { args: { graph: ChangeFlowFixtures.godot.flow.graph } }

export const SelectedFile: Story = {
  beforeEach: () => {
    useNavigationStore.setState({
      selectedPath: 'src/hooks/use-file-content.ts',
      reveal: null,
      focus: null,
    })
  },
}
