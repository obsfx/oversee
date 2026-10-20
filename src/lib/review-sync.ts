import { BranchSelectionGuard, type ComparisonSelection } from '@/src/lib/branch-selection-guard.ts'
import { DocumentTitleSync } from '@/src/lib/document-title-sync.ts'
import { FaviconBlinker } from '@/src/lib/favicon-blinker.ts'
import { DocumentFavicon } from '@/src/lib/favicon-frames.ts'
import { InstallCompletionWatch, type ReadyServerPort } from '@/src/lib/install-completion-watch.ts'
import { NotificationBlink } from '@/src/lib/notification-blink.ts'
import { ReducedMotion } from '@/src/lib/reduced-motion.ts'
import {
  ReviewedMarksSync,
  type FollowedComparison,
  type ReviewedMarksStore,
} from '@/src/lib/reviewed-marks-sync.ts'
import type { Services } from '@/src/lib/services.ts'

export interface ReviewSyncPorts {
  selection: ComparisonSelection & FollowedComparison
  marks: ReviewedMarksStore
  ready: ReadyServerPort
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
      this.services.serverSync.start(),
      new BranchSelectionGuard(this.services.branches, this.ports.selection).start(),
      new ReviewedMarksSync(
        {
          workspace: this.services.workspace,
          branches: this.services.branches,
          changeSets: this.services.changeSets,
          gateway: this.services.reviewedMarks,
        },
        this.ports.marks,
        this.ports.selection,
      ).start(),
      new NotificationBlink(
        this.services.notifications.list,
        new FaviconBlinker(DocumentFavicon.show),
        ReducedMotion.preferred,
      ).start(),
      new DocumentTitleSync(this.services.workspace).start(),
      new InstallCompletionWatch(this.services.languageServers.list, this.ports.ready).start(),
    ]
    return () => {
      for (const dispose of disposers) {
        dispose()
      }
    }
  }
}
