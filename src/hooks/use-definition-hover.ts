import { useEffect, useState } from 'react'
import {
  DefinitionHover,
  type HoverToken,
  type TokenEventProps,
  type TokenHandlers,
} from '@/src/lib/definition-hover.ts'
import { EditableTargets } from '@/src/lib/editable-targets.ts'

interface ShownToken {
  token: HoverToken
  visible: boolean
}

export const useDefinitionHover = (
  path: string,
  onNavigate: (token: HoverToken) => Promise<boolean>,
) => {
  const [shown, setShown] = useState<ShownToken | null>(null)
  const [hover] = useState(() => {
    return new DefinitionHover({
      open: (token) => {
        setShown({ token, visible: true })
      },
      close: () => {
        setShown((current) => {
          return current ? { ...current, visible: false } : current
        })
      },
    })
  })

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (EditableTargets.is(event.target)) {
        hover.blur()
        return
      }
      hover.key(event)
    }
    const onBlur = () => {
      hover.blur()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKey)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKey)
      window.removeEventListener('blur', onBlur)
      hover.dispose()
    }
  }, [hover])

  const tokenOf = (props: TokenEventProps): HoverToken => {
    let side: HoverToken['side'] = 'new'
    if (props.side) {
      side = DefinitionHover.sideOf(props.side)
    }
    return {
      path,
      side,
      line: props.lineNumber,
      character: props.lineCharStart,
      element: props.tokenElement,
    }
  }

  const tokenHandlers: TokenHandlers = {
    onTokenEnter: (props, event) => {
      hover.enter(tokenOf(props), event)
    },
    onTokenLeave: () => {
      hover.leave()
    },
    onTokenClick: (props, event) => {
      if (!hover.click(event)) {
        return
      }
      const token = tokenOf(props)
      void onNavigate(token).then((handled) => {
        if (!handled) {
          hover.show(token)
        }
      })
    },
  }

  return {
    token: shown?.token ?? null,
    visible: shown?.visible ?? false,
    tokenHandlers,
    popover: {
      onPointerEnter: () => {
        hover.popoverEnter()
      },
      onPointerLeave: () => {
        hover.popoverLeave()
      },
      close: () => {
        hover.dismiss()
      },
    },
  }
}
