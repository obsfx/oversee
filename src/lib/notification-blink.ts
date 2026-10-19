import type { AsyncResource, ResourceState } from '@/src/lib/async-resource.ts'
import type { FaviconBlinker } from '@/src/lib/favicon-blinker.ts'
import type { ReviewNotification } from '@/src/lib/notification-gateway.ts'
import { NotificationLists } from '@/src/lib/notification-lists.ts'

const NOTIFICATION_BLINKS = 2

type NotificationsState = ResourceState<ReviewNotification[]>

export class NotificationBlink {
  private readonly list: AsyncResource<ReviewNotification[]>
  private readonly blinker: FaviconBlinker
  private readonly prefersReducedMotion: () => boolean

  constructor(
    list: AsyncResource<ReviewNotification[]>,
    blinker: FaviconBlinker,
    prefersReducedMotion: () => boolean,
  ) {
    this.list = list
    this.blinker = blinker
    this.prefersReducedMotion = prefersReducedMotion
  }

  private static unreadRose(state: NotificationsState, previous: NotificationsState) {
    if (state.status !== 'ready' || previous.status !== 'ready') {
      return false
    }
    return (
      NotificationLists.unread(state.data).length > NotificationLists.unread(previous.data).length
    )
  }

  start() {
    void this.list.load()
    const unsubscribe = this.list.store.subscribe((state, previous) => {
      if (NotificationBlink.unreadRose(state, previous) && !this.prefersReducedMotion()) {
        this.blinker.blink(NOTIFICATION_BLINKS, document.hidden)
      }
    })
    return () => {
      unsubscribe()
      this.blinker.stop()
    }
  }
}
