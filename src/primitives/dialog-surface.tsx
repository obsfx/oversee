import { Dialog } from '@base-ui/react/dialog'
import type { KeyboardEventHandler, ReactNode, RefObject } from 'react'
import { VscClose } from 'react-icons/vsc'
import { c } from '@/src/c.ts'
import { IconButton } from '@/src/primitives/icon-button.tsx'
import { Tooltip } from '@/src/primitives/tooltip.tsx'

interface DialogSurfaceProps {
  title: ReactNode
  actions?: ReactNode
  bodyRef?: RefObject<HTMLDivElement | null>
  onKeyDown?: KeyboardEventHandler<HTMLDivElement>
  children: ReactNode
}

export function DialogSurface({
  title,
  actions,
  bodyRef,
  onKeyDown,
  children,
}: DialogSurfaceProps) {
  return (
    <Dialog.Portal>
      <Dialog.Backdrop
        className={c(
          'fixed inset-0 z-50 bg-black/35',
          'transition-opacity duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]',
          'data-ending-style:opacity-0 data-ending-style:duration-150 data-starting-style:opacity-0',
        )}
      />
      <Dialog.Popup
        initialFocus={bodyRef}
        onKeyDown={onKeyDown}
        className={c(
          'fixed top-1/2 left-1/2 z-50 flex max-h-[86vh] w-[min(50rem,calc(100vw-2rem))] -translate-1/2 flex-col',
          'rounded-lg border border-line bg-popup text-fg shadow-2xl outline-none',
          'transition-[scale,opacity] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]',
          'data-starting-style:scale-96 data-starting-style:opacity-0',
          'data-ending-style:scale-96 data-ending-style:opacity-0 data-ending-style:duration-150',
          'motion-reduce:data-ending-style:scale-100 motion-reduce:data-starting-style:scale-100',
        )}
      >
        <div className={'flex items-center gap-2 border-b border-line px-3 py-2'}>
          <Dialog.Title className={'min-w-0 flex-1 font-normal'}>{title}</Dialog.Title>
          {actions}
          <Tooltip label={'Close (Esc)'}>
            <Dialog.Close render={<IconButton aria-label={'Close'} />}>
              <VscClose />
            </Dialog.Close>
          </Tooltip>
        </div>
        <div
          ref={bodyRef}
          tabIndex={-1}
          className={'min-h-0 overflow-auto overscroll-contain px-6 py-5 outline-none'}
        >
          <div className={'mx-auto max-w-[44rem]'}>{children}</div>
        </div>
      </Dialog.Popup>
    </Dialog.Portal>
  )
}
