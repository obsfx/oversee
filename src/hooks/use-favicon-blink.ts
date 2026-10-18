import { useEffect, useRef, useState } from 'react'
import { useNotifications } from '@/src/hooks/use-notifications.ts'
import { useReducedMotion } from '@/src/hooks/use-reduced-motion.ts'
import { FaviconBlinker } from '@/src/lib/favicon-blinker.ts'
import { DocumentFavicon } from '@/src/lib/favicon-frames.ts'

const NOTIFICATION_BLINKS = 2

export const useFaviconBlink = () => {
  const { state, unreadCount } = useNotifications()
  const reducedMotion = useReducedMotion()
  const [blinker] = useState(() => {
    return new FaviconBlinker(DocumentFavicon.show)
  })
  const previousUnread = useRef<number | null>(null)

  useEffect(() => {
    if (state.status !== 'ready') {
      return
    }
    const previous = previousUnread.current
    previousUnread.current = unreadCount
    if (previous !== null && unreadCount > previous && !reducedMotion) {
      blinker.blink(NOTIFICATION_BLINKS, document.hidden)
    }
  }, [blinker, state.status, unreadCount, reducedMotion])

  useEffect(() => {
    return () => {
      blinker.stop()
    }
  }, [blinker])
}
