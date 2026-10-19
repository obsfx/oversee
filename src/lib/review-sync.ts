import { BranchSelectionGuard, type ComparisonSelection } from '@/src/lib/branch-selection-guard.ts'
import { DocumentTitleSync } from '@/src/lib/document-title-sync.ts'
import { FaviconBlinker } from '@/src/lib/favicon-blinker.ts'
import { DocumentFavicon } from '@/src/lib/favicon-frames.ts'
import { NotificationBlink } from '@/src/lib/notification-blink.ts'
import { ReducedMotion } from '@/src/lib/reduced-motion.ts'
import type { Services } from '@/src/lib/services.ts'

export interface ReviewedFiles {
  unmark(paths: readonly string[]): void
}

export interface ReviewSyncPorts {
  selection: ComparisonSelection
  reviewed: ReviewedFiles
}

export class ReviewSync {
  private readonly services: Services
  private readonly ports: ReviewSyncPorts

  constructor(services: Services, ports: ReviewSyncPorts) {
    this.services = services
    this.ports = ports
  }

  start() {
    const disposers = [
      this.services.serverSync.start((change) => {
        this.ports.reviewed.unmark(change.paths)
      }),
      new BranchSelectionGuard(this.services.branches, this.ports.selection).start(),
      new NotificationBlink(
        this.services.notifications.list,
        new FaviconBlinker(DocumentFavicon.show),
        ReducedMotion.preferred,
      ).start(),
      new DocumentTitleSync(this.services.workspace).start(),
    ]
    return () => {
      for (const dispose of disposers) {
        dispose()
      }
    }
  }
}
