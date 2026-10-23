import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { Sidebar } from '@/src/components/sidebar/sidebar.tsx'
import type { Services } from '@/src/lib/services.ts'
import { ChangeFlowFixtures } from '@/src/stories/support/change-flow-fixture.ts'
import { createStoryServices } from '@/src/stories/support/fixtures.ts'
import { seedReviewedMarks } from '@/src/stories/support/story-review-state.ts'
import { StoryFrame } from '@/src/stories/support/story-frame.tsx'
import { useLayoutStore } from '@/src/store/layout-store.ts'
import { useSymbolHighlightStore } from '@/src/store/symbol-highlight-store.ts'

const meta = {
  title: 'Components/Sidebar/Sidebar',
  component: Sidebar,
  parameters: { layout: 'fullscreen' },
  args: { services: createStoryServices() },
  beforeEach: () => {
    seedReviewedMarks()
    useSymbolHighlightStore.getState().clear()
  },
  argTypes: { services: { table: { disable: true } } },
  render: ({ services }) => {
    return (
      <StoryFrame services={services}>
        <div className={'-m-3 h-screen w-80'}>
          <Sidebar />
        </div>
      </StoryFrame>
    )
  },
} satisfies Meta<{ services: Services }>

export default meta

type Story = StoryObj<typeof meta>

export const Files: Story = {}

export const Flow: Story = {
  args: { services: ChangeFlowFixtures.servicesOf(ChangeFlowFixtures.oversee) },
  beforeEach: () => {
    seedReviewedMarks([], ChangeFlowFixtures.changesOf(ChangeFlowFixtures.oversee))
    useLayoutStore.setState({ sidebarMode: 'flow' })
  },
}

export const FlowGodot: Story = {
  args: { services: ChangeFlowFixtures.servicesOf(ChangeFlowFixtures.godot) },
  beforeEach: () => {
    seedReviewedMarks([], ChangeFlowFixtures.changesOf(ChangeFlowFixtures.godot))
    useLayoutStore.setState({ sidebarMode: 'flow' })
  },
}

export const FlowFilterUnderCollapsedRows: Story = {
  ...FlowGodot,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await canvas.findByText('GameState.register_dash')
    await userEvent.click(canvas.getByRole('button', { name: 'Collapse all' }))
    await expect(canvas.queryByText('GameState.register_dash')).toBeNull()

    await userEvent.type(canvas.getByPlaceholderText('Filter functions'), 'register_dash')

    const match = await canvas.findByText('GameState.register_dash')
    await expect(match).toBeVisible()
    await expect(canvas.getByText('Player._try_dash')).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Collapse all' })).toBeDisabled()
  },
}

export const FlowStateSurvivesModeSwitch: Story = {
  ...FlowGodot,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const filter = await canvas.findByPlaceholderText('Filter functions')
    await userEvent.type(filter, 'register_dash')

    const page = within(canvasElement.ownerDocument.body)
    await userEvent.click(canvas.getByRole('button', { name: 'Sidebar view: Flow' }))
    const files = await page.findByRole('menuitemradio', { name: /Changed files/ })
    await userEvent.click(files)
    await expect(canvas.queryByPlaceholderText('Filter functions')).toBeNull()
    await userEvent.click(canvas.getByRole('button', { name: 'Sidebar view: Files' }))
    const flow = await page.findByRole('menuitemradio', { name: /Call flow/ })
    await userEvent.click(flow)

    const restored = await canvas.findByPlaceholderText('Filter functions')
    await expect(restored).toHaveValue('register_dash')
    const match = await canvas.findByText('GameState.register_dash')
    await expect(match).toBeVisible()
  },
}

export const ModeMenuWithKeyboard: Story = {
  args: { services: ChangeFlowFixtures.servicesOf(ChangeFlowFixtures.oversee) },
  beforeEach: () => {
    seedReviewedMarks([], ChangeFlowFixtures.changesOf(ChangeFlowFixtures.oversee))
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const page = within(canvasElement.ownerDocument.body)
    const trigger = await canvas.findByRole('button', { name: 'Sidebar view: Files' })
    trigger.focus()
    await userEvent.keyboard('{Enter}')

    const files = await page.findByRole('menuitemradio', { name: /Changed files/ })
    await waitFor(() => {
      return expect(files).toHaveFocus()
    })
    await userEvent.keyboard('{ArrowDown}')
    const flow = page.getByRole('menuitemradio', { name: /Call flow/ })
    await waitFor(() => {
      return expect(flow).toHaveFocus()
    })
    await userEvent.keyboard('{Enter}')

    await waitFor(() => {
      return expect(page.queryByRole('menu')).toBeNull()
    })
    const flowTrigger = await canvas.findByRole('button', { name: 'Sidebar view: Flow' })
    await expect(flowTrigger).toBeVisible()
    const tree = await canvas.findByRole('tree', { name: 'Calls between the changed functions' })
    await expect(tree).toBeVisible()
  },
}
