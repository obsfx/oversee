import type { FileTreeIconConfig } from '@pierre/trees'
import type { CSSProperties } from 'react'
import type { Theme } from '@/src/lib/settings-schema.ts'

const REVIEWED_ICON = 'oversee-reviewed'

const SPRITE = `<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute"><symbol id="${REVIEWED_ICON}" viewBox="0 0 16 16"><path fill="currentColor" d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 1 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"/></symbol></svg>`

const FOLDER_CLOSED = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><path d='M1 4.5C1 3.12 2.12 2 3.5 2h2.09c.4 0 .78.16 1.06.44L8.21 4h4.29C13.88 4 15 5.12 15 6.5v5c0 1.38-1.12 2.5-2.5 2.5h-9A2.5 2.5 0 0 1 1 11.5v-7Z'/></svg>`

const FOLDER_OPEN = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><path d='M1 4.5C1 3.12 2.12 2 3.5 2h1.09c.4 0 .78.16 1.06.44L7.21 4h3.29c1.22 0 2.24.88 2.46 2.04 1.65.3 2.59 2.18 1.7 3.71l-1.58 2.75A2.5 2.5 0 0 1 10.48 14H3.5A2.5 2.5 0 0 1 1 11.5v-7Z'/></svg>`

const FOLDER_CLOSED_FRONT = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><path d='M1 7.5C1 6.67 1.67 6 2.5 6h11c.83 0 1.5.67 1.5 1.5v4c0 1.38-1.12 2.5-2.5 2.5h-9A2.5 2.5 0 0 1 1 11.5v-4Z'/></svg>`

const FOLDER_OPEN_FRONT = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><path d='M5.2 6.5h7.9a1.5 1.5 0 0 1 1.3 2.25l-1.98 3.5A3.5 3.5 0 0 1 10.39 14H3.1a1.5 1.5 0 0 1-1.3-2.25l2.1-3.5A1.5 1.5 0 0 1 5.2 6.5Z'/></svg>`

const COMPACT_ITEM_HEIGHT = 24

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
  '--trees-font-size-override': '0.75rem',
  '--trees-level-gap-override': '0.625rem',
  '--trees-padding-inline-override': '0.375rem',
  height: '100%',
} as CSSProperties

export abstract class FileTreeAppearance {
  private static maskUrl(svg: string) {
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
  }

  private static stylesheet() {
    const closed = FileTreeAppearance.maskUrl(FOLDER_CLOSED)
    const open = FileTreeAppearance.maskUrl(FOLDER_OPEN)
    const closedFront = FileTreeAppearance.maskUrl(FOLDER_CLOSED_FRONT)
    const openFront = FileTreeAppearance.maskUrl(FOLDER_OPEN_FRONT)
    return `
  [data-type="item"] { gap: 0.25rem; }
  [data-file-tree-search-container] { display: none; }
  [data-item-section="spacing-item"] { opacity: 1; }
  [data-item-type="folder"] > [data-item-section="icon"] {
    width: auto;
    gap: 0.1875rem;
  }
  [data-item-type="folder"] > [data-item-section="icon"]::before,
  [data-item-type="folder"] > [data-item-section="icon"]::after {
    content: "";
    flex: none;
    width: 0.875rem;
    height: 0.875rem;
  }
  [data-item-type="folder"] > [data-item-section="icon"]::after {
    order: 1;
    background-color: var(--color-folder-back);
    mask: ${closed} no-repeat center / contain;
  }
  [data-item-type="folder"] > [data-item-section="icon"]::before {
    order: 2;
    margin-left: -1.0625rem;
    background-color: var(--color-folder);
    mask: ${closedFront} no-repeat center / contain;
  }
  [data-item-type="folder"][aria-expanded="true"] > [data-item-section="icon"]::after {
    mask-image: ${open};
  }
  [data-item-type="folder"][aria-expanded="true"] > [data-item-section="icon"]::before {
    mask-image: ${openFront};
  }
  [data-item-section="decoration"] {
    order: -1;
    flex: none;
    width: 0.875rem;
    margin-right: 0.125rem;
    color: var(--color-reviewed);
  }
`
  }

  static readonly reviewedIcon = REVIEWED_ICON
  static readonly css = FileTreeAppearance.stylesheet()
  static readonly icons: FileTreeIconConfig = {
    set: 'complete',
    colored: true,
    spriteSheet: SPRITE,
  }

  static itemHeight(uiScale: number) {
    return Math.round(COMPACT_ITEM_HEIGHT * uiScale)
  }

  static hostStyle(theme: Theme): CSSProperties {
    return { ...HOST_STYLE, colorScheme: theme }
  }
}
