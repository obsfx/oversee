import type { FileTreeIconConfig } from '@pierre/trees'
import type { CSSProperties } from 'react'
import type { Theme } from './settings-schema.ts'

const REVIEWED_ICON = 'oversee-reviewed'

const SPRITE = `<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute"><symbol id="${REVIEWED_ICON}" viewBox="0 0 16 16"><path fill="currentColor" d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 1 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"/></symbol></svg>`

const FOLDER_CLOSED = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><path d='M1 4.5C1 3.12 2.12 2 3.5 2h2.09c.4 0 .78.16 1.06.44L8.21 4h4.29C13.88 4 15 5.12 15 6.5v5c0 1.38-1.12 2.5-2.5 2.5h-9A2.5 2.5 0 0 1 1 11.5v-7Z'/></svg>`

const FOLDER_OPEN = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><path d='M1 4.5C1 3.12 2.12 2 3.5 2h1.09c.4 0 .78.16 1.06.44L7.21 4h3.29c1.22 0 2.24.88 2.46 2.04 1.65.3 2.59 2.18 1.7 3.71l-1.58 2.75A2.5 2.5 0 0 1 10.48 14H3.5A2.5 2.5 0 0 1 1 11.5v-7Z'/></svg>`

const maskUrl = (svg: string) => {
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}

const CSS = `
  [data-type="item"] { gap: 4px; }
  [data-file-tree-search-container] { display: none; }
  [data-item-section="spacing-item"] { opacity: 1; }
  [data-item-type="folder"] > [data-item-section="icon"] {
    width: auto;
    gap: 3px;
  }
  [data-item-type="folder"] > [data-item-section="icon"]::after {
    content: "";
    flex: none;
    width: 14px;
    height: 14px;
    background-color: var(--color-folder);
    mask: ${maskUrl(FOLDER_CLOSED)} no-repeat center / contain;
  }
  [data-item-type="folder"][aria-expanded="true"] > [data-item-section="icon"]::after {
    mask-image: ${maskUrl(FOLDER_OPEN)};
  }
  [data-item-section="decoration"] {
    order: -1;
    flex: none;
    width: 14px;
    margin-right: 2px;
    color: var(--color-reviewed);
  }
`

const HOST_STYLE = {
  '--trees-bg-override': 'var(--color-sidebar)',
  '--trees-bg-muted-override': 'var(--color-sidebar-hover)',
  '--trees-fg-override': 'var(--color-sidebar-fg)',
  '--trees-fg-muted-override': 'var(--color-sidebar-muted)',
  '--trees-indent-guide-bg-override': 'var(--color-sidebar-guide)',
  '--trees-selected-bg-override': 'var(--color-sidebar-selected)',
  '--trees-selected-fg-override': 'var(--color-fg)',
  '--trees-git-added-color-override': 'var(--color-status-added)',
  '--trees-git-modified-color-override': 'var(--color-status-modified)',
  '--trees-git-deleted-color-override': 'var(--color-status-deleted)',
  '--trees-git-renamed-color-override': 'var(--color-status-renamed)',
  '--trees-git-untracked-color-override': 'var(--color-status-untracked)',
  '--trees-font-family-override': 'var(--font-ui)',
  '--trees-font-size-override': '12px',
  '--trees-level-gap-override': '10px',
  '--trees-padding-inline-override': '6px',
  height: '100%',
} as CSSProperties

export abstract class FileTreeAppearance {
  static readonly reviewedIcon = REVIEWED_ICON
  static readonly css = CSS
  static readonly icons: FileTreeIconConfig = {
    set: 'complete',
    colored: true,
    spriteSheet: SPRITE,
  }

  static hostStyle(theme: Theme): CSSProperties {
    return { ...HOST_STYLE, colorScheme: theme }
  }
}
