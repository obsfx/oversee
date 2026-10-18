import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { FontWeightSelect } from '../../../components/topbar/font-weight-select.tsx'

const meta = {
  title: 'Components/Topbar/FontWeightSelect',
  component: FontWeightSelect,
  args: { label: 'UI font weight', family: 'Google Sans Flex', value: 400, onChange: fn() },
} satisfies Meta<typeof FontWeightSelect>

export default meta

type Story = StoryObj<typeof meta>

export const WithNames: Story = {}

export const SingleWeightFont: Story = { args: { family: 'Lobster', value: 400 } }
