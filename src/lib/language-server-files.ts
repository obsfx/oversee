import { PathParts } from '@/src/lib/path-parts.ts'
import type { LanguageServer, LanguageServerList } from '@/src/lib/language-server-gateway.ts'
import { LanguageServers } from '@/src/lib/language-servers.ts'

export abstract class LanguageServerFiles {
  static fileTypeOf(list: LanguageServerList, path: string) {
    const name = PathParts.name(path)
    const extension = LanguageServerFiles.extensionOf(name)
    const entries = Object.entries(list.fileTypes)
    const byFilename = entries.find(([, mapping]) => {
      return mapping.filenames.includes(name)
    })
    if (byFilename) {
      return byFilename[0]
    }
    const byExtension = entries.find(([, mapping]) => {
      return extension !== null && mapping.extensions.includes(extension)
    })
    return byExtension ? byExtension[0] : null
  }

  static serverFor(list: LanguageServerList, path: string): LanguageServer | null {
    const fileType = LanguageServerFiles.fileTypeOf(list, path)
    if (!fileType) {
      return null
    }
    return LanguageServers.byId(list, list.fileTypes[fileType].server)
  }

  static fileLabel(list: LanguageServerList, path: string) {
    const name = PathParts.name(path)
    const byFilename = Object.values(list.fileTypes).some((mapping) => {
      return mapping.filenames.includes(name)
    })
    const extension = LanguageServerFiles.extensionOf(name)
    if (byFilename || extension === null) {
      return name
    }
    return `.${extension} files`
  }

  private static extensionOf(name: string) {
    const dot = name.lastIndexOf('.')
    return dot >= 0 ? name.slice(dot + 1) : null
  }
}
