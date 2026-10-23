import type { IconType } from 'react-icons'
import {
  SiDotenv,
  SiGit,
  SiGo,
  SiGodotengine,
  SiGraphql,
  SiJavascript,
  SiJson,
  SiMarkdown,
  SiPostgresql,
  SiReact,
  SiSvg,
  SiTypescript,
  SiYaml,
} from 'react-icons/si'
import { TbFile, TbFileTypeCss, TbFileTypeHtml, TbFileTypeTxt, TbVideo } from 'react-icons/tb'
import { c } from '@/src/c.ts'
import type { FileKind } from '@/src/lib/file-kinds.ts'

const ICONS: Record<FileKind, IconType> = {
  typescript: SiTypescript,
  react: SiReact,
  javascript: SiJavascript,
  go: SiGo,
  gdscript: SiGodotengine,
  godot: SiGodotengine,
  json: SiJson,
  markdown: SiMarkdown,
  css: TbFileTypeCss,
  html: TbFileTypeHtml,
  yaml: SiYaml,
  graphql: SiGraphql,
  sql: SiPostgresql,
  image: SiSvg,
  video: TbVideo,
  env: SiDotenv,
  git: SiGit,
  text: TbFileTypeTxt,
  default: TbFile,
}

const TONES: Record<FileKind, string> = {
  typescript: 'text-kind-typescript',
  react: 'text-kind-react',
  javascript: 'text-kind-javascript',
  go: 'text-kind-go',
  gdscript: 'text-kind-godot',
  godot: 'text-kind-godot',
  json: 'text-kind-json',
  markdown: 'text-fg-muted',
  css: 'text-kind-css',
  html: 'text-kind-html',
  yaml: 'text-kind-yaml',
  graphql: 'text-kind-graphql',
  sql: 'text-kind-sql',
  image: 'text-kind-image',
  video: 'text-kind-video',
  env: 'text-kind-env',
  git: 'text-kind-git',
  text: 'text-fg-muted',
  default: 'text-fg-muted',
}

export function FileKindIcon({ kind }: { kind: FileKind }) {
  const Icon = ICONS[kind]

  return (
    <span
      aria-hidden={true}
      className={c('inline-flex size-3.5 shrink-0 items-center justify-center', TONES[kind])}
    >
      <Icon className={'size-3'} />
    </span>
  )
}
