import { describe, expect, it } from 'vitest'
import { SidebarModes } from '@/src/lib/sidebar-modes.ts'

describe('SidebarModes', () => {
  it('names each mode for the menu', () => {
    expect(SidebarModes.title('files')).toBe('Changed files')
    expect(SidebarModes.title('flow')).toBe('Call flow')
    expect(SidebarModes.detail('files')).toBe('The changed files as a tree')
    expect(SidebarModes.detail('flow')).toBe('The changed functions in call order')
  })

  it('labels the menu trigger with the current mode', () => {
    expect(SidebarModes.menuTriggerLabel('files')).toBe('Sidebar view: Files')
    expect(SidebarModes.menuTriggerLabel('flow')).toBe('Sidebar view: Flow')
  })

  it('parses known modes', () => {
    expect(SidebarModes.parse('files')).toBe('files')
    expect(SidebarModes.parse('flow')).toBe('flow')
  })

  it('falls back to files for anything else', () => {
    for (const value of [undefined, null, '', 'Flow', 'tree', 1, {}]) {
      expect(SidebarModes.parse(value)).toBe('files')
    }
  })
})
