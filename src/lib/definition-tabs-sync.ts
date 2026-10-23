import { Disposers } from '@/src/lib/disposers.ts'
import type { FollowedComparison } from '@/src/lib/followed-change-set-watch.ts'

export interface DefinitionTabsPort {
  reset(): void
  showReview(): void
}

export interface ReviewNavigation {
  subscribe(listener: () => void): () => void
}

export class DefinitionTabsSync {
  private readonly comparison: FollowedComparison
  private readonly navigation: ReviewNavigation
  private readonly tabs: DefinitionTabsPort

  constructor(
    comparison: FollowedComparison,
    navigation: ReviewNavigation,
    tabs: DefinitionTabsPort,
  ) {
    this.comparison = comparison
    this.navigation = navigation
    this.tabs = tabs
  }

  start() {
    return Disposers.all([
      this.comparison.subscribe(() => {
        this.tabs.reset()
      }),
      this.navigation.subscribe(() => {
        this.tabs.showReview()
      }),
    ])
  }
}
