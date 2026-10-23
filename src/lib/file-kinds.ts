import { PathParts } from '@/src/lib/path-parts.ts'

export type FileKind =
  | 'typescript'
  | 'react'
  | 'javascript'
  | 'go'
  | 'gdscript'
  | 'godot'
  | 'json'
  | 'markdown'
  | 'css'
  | 'html'
  | 'yaml'
  | 'graphql'
  | 'sql'
  | 'image'
  | 'video'
  | 'env'
  | 'git'
  | 'text'
  | 'default'

const EXTENSIONS: Record<string, FileKind> = {
  ts: 'typescript',
  mts: 'typescript',
  cts: 'typescript',
  tsx: 'react',
  jsx: 'react',
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  go: 'go',
  gd: 'gdscript',
  tscn: 'godot',
  tres: 'godot',
  godot: 'godot',
  json: 'json',
  md: 'markdown',
  mdx: 'markdown',
  css: 'css',
  scss: 'css',
  html: 'html',
  yml: 'yaml',
  yaml: 'yaml',
  graphql: 'graphql',
  gql: 'graphql',
  sql: 'sql',
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  gif: 'image',
  svg: 'image',
  webp: 'image',
  ico: 'image',
  mp4: 'video',
  mov: 'video',
  webm: 'video',
  txt: 'text',
}

export abstract class FileKinds {
  static of(path: string): FileKind {
    const name = PathParts.name(path)
    if (name.startsWith('.env')) {
      return 'env'
    }
    if (name.startsWith('.git')) {
      return 'git'
    }
    const kind = FileKinds.ofExtension(name)
    if (kind === 'default' && /(^|\/)migrations?\//.test(path)) {
      return 'sql'
    }
    return kind
  }

  private static ofExtension(name: string): FileKind {
    const dot = name.lastIndexOf('.')
    if (dot <= 0) {
      return 'default'
    }
    return EXTENSIONS[name.slice(dot + 1).toLowerCase()] ?? 'default'
  }
}
