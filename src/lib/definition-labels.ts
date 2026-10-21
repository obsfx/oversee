import { ApiError } from '@/src/lib/api-client.ts'
import type { Definition, DefinitionLookup } from '@/src/lib/definition-gateway.ts'
import type { DefinitionTab } from '@/src/lib/definition-tabs.ts'
import { PathParts } from '@/src/lib/path-parts.ts'

interface DefinitionStatusLabel {
  title: string
  detail: string
}

interface TabTitle {
  label: string
  head: string
  tail: string
  hint: string
}

const TITLE_TAIL = 10

export abstract class DefinitionLabels {
  static tabTitles(tabs: DefinitionTab[]) {
    const groups = new Map<string, DefinitionTab[]>()
    for (const tab of tabs) {
      const name = PathParts.name(tab.path)
      groups.set(name, [...(groups.get(name) ?? []), tab])
    }
    const titles = new Map<string, TabTitle>()
    for (const [name, group] of groups) {
      const hints = DefinitionLabels.hints(group)
      group.forEach((tab, index) => {
        const hint = hints[index]
        const label = hint ? `${name}, ${hint}` : name
        titles.set(tab.id, { label, hint, ...DefinitionLabels.titleParts(name) })
      })
    }
    return titles
  }

  static location(definition: Definition) {
    return `${PathParts.name(definition.path)}:${definition.line}`
  }

  static tabTitle(tab: DefinitionTab) {
    return PathParts.name(tab.path)
  }

  static closeTab(tab: DefinitionTab) {
    return `Close ${DefinitionLabels.tabTitle(tab)}`
  }

  static missing(tab: Pick<DefinitionTab, 'path'>): DefinitionStatusLabel {
    return {
      title: 'This file no longer exists',
      detail: `${tab.path} is not in the working tree anymore`,
    }
  }

  static readOnly(tab: Pick<DefinitionTab, 'external'>) {
    return tab.external ? 'Outside the repository' : 'Not changed in this comparison'
  }

  static loading(): DefinitionStatusLabel {
    return { title: 'Looking up the definition', detail: '' }
  }

  static requestFailed(error: Error): DefinitionStatusLabel {
    return {
      title: 'Could not look up the definition',
      detail: ApiError.describe(error, 'Request'),
    }
  }

  static status(lookup: DefinitionLookup): DefinitionStatusLabel {
    const server = lookup.server || 'The language server'
    switch (lookup.status) {
      case 'ready':
        return { title: 'No definition found', detail: '' }
      case 'unsupported':
        return { title: 'No language server for this file', detail: '' }
      case 'not-installed':
        return { title: `${server} is not installed`, detail: 'Install it to go to definitions' }
      case 'needs-checkout':
        return {
          title: 'This branch is not checked out',
          detail: 'Go to definition reads the working tree',
        }
      case 'starting':
        return { title: `Starting ${server}`, detail: 'Try again in a moment' }
      case 'indexing':
        return { title: `${server} is indexing`, detail: 'Try again in a moment' }
      case 'failed':
        return { title: `${server} failed`, detail: lookup.error.split('\n')[0] }
    }
  }

  private static titleParts(name: string) {
    const characters = [...name]
    if (characters.length <= TITLE_TAIL * 2) {
      return { head: name, tail: '' }
    }
    return {
      head: characters.slice(0, -TITLE_TAIL).join(''),
      tail: characters.slice(-TITLE_TAIL).join(''),
    }
  }

  private static hints(group: DefinitionTab[]) {
    if (group.length === 1) {
      return ['']
    }
    const directories = group.map((tab) => {
      return PathParts.segments(PathParts.directory(tab.path))
    })
    const deepest = Math.max(
      ...directories.map((segments) => {
        return segments.length
      }),
    )
    let hints = directories.map(() => {
      return ''
    })
    for (let depth = 1; depth <= deepest; depth += 1) {
      hints = directories.map((segments) => {
        return segments.slice(-depth).join('/')
      })
      if (new Set(hints).size === hints.length) {
        break
      }
    }
    return hints
  }
}
