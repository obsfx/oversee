import * as v from 'valibot'
import { ValueSchemas } from '@/src/lib/value-schemas.ts'

const STATUSES = ['not-installed', 'installing', 'installed', 'failed'] as const

export type LanguageServerStatus = (typeof STATUSES)[number]

export interface InstallProgress {
  received: number
  total: number
}

export interface LanguageServer {
  id: string
  description: string
  homepage: string
  languages: string[]
  fileTypes: string[]
  version: string
  requires: string[]
  missing: string[]
  available: boolean
  status: LanguageServerStatus
  progress: InstallProgress | null
  installedVersion: string
  updateAvailable: boolean
  error: string
}

export interface FileTypeMapping {
  extensions: string[]
  filenames: string[]
  server: string
}

export interface LanguageServerList {
  platform: string
  fileTypes: Record<string, FileTypeMapping>
  servers: LanguageServer[]
}

export interface LanguageServerGateway {
  list(): Promise<LanguageServerList>
  install(id: string): Promise<LanguageServer>
  uninstall(id: string): Promise<void>
  cancel(id: string): Promise<void>
}

export abstract class LanguageServerShapes {
  private static readonly strings = v.fallback(v.array(v.string()), [])

  static readonly server = v.object({
    id: v.string(),
    description: v.fallback(v.string(), ''),
    homepage: v.fallback(v.string(), ''),
    languages: LanguageServerShapes.strings,
    fileTypes: LanguageServerShapes.strings,
    version: v.string(),
    requires: LanguageServerShapes.strings,
    missing: LanguageServerShapes.strings,
    available: v.boolean(),
    status: v.picklist(STATUSES),
    progress: v.fallback(
      v.nullable(v.object({ received: ValueSchemas.count, total: ValueSchemas.count })),
      null,
    ),
    installedVersion: v.fallback(v.string(), ''),
    updateAvailable: v.fallback(v.boolean(), false),
    error: v.fallback(v.string(), ''),
  })

  static readonly list = v.object({
    platform: v.string(),
    fileTypes: v.record(
      v.string(),
      v.object({
        extensions: LanguageServerShapes.strings,
        filenames: LanguageServerShapes.strings,
        server: v.string(),
      }),
    ),
    servers: v.array(LanguageServerShapes.server),
  })
}
