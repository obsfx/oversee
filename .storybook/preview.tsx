import type { Preview } from '@storybook/react-vite'
import '@/src/index.css'
import { useLayoutStore } from '@/src/store/layout-store.ts'
import { useNavigationStore } from '@/src/store/navigation-store.ts'
import { useSidebarViewStore } from '@/src/store/sidebar-view-store.ts'

const preview: Preview = {
  beforeEach: () => {
    useLayoutStore.setState({ sidebarMode: 'files' })
    useNavigationStore.setState({ selectedPath: null, reveal: null, focus: null })
    useSidebarViewStore.setState(useSidebarViewStore.getInitialState())
  },
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
}

export default preview
