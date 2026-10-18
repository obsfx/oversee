import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { FontPicker } from '@/src/components/topbar/font-picker.tsx'
import { GoogleFontCatalog } from '@/src/lib/google-font-catalog.ts'

const meta = {
  title: 'Components/Topbar/FontPicker',
  component: FontPicker,
  args: {
    label: 'UI font',
    value: 'Google Sans Flex',
    families: GoogleFontCatalog.uiFamilies,
    onChange: fn(),
  },
  argTypes: { families: { table: { disable: true } } },
  decorators: [
    (Story) => {
      return (
        <div className={'flex justify-end'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof FontPicker>

export default meta

type Story = StoryObj<typeof meta>

export const AllFonts: Story = {}

export const MonospaceOnly: Story = {
  args: {
    label: 'Editor font',
    value: 'JetBrains Mono',
    families: GoogleFontCatalog.editorFamilies,
  },
}
