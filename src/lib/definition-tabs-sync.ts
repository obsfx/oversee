import type { FollowedComparison } from '@/src/lib/reviewed-marks-sync.ts'

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
    const disposers = [
      this.comparison.subscribe(() => {
        this.tabs.reset()
      }),
      this.navigation.subscribe(() => {
        this.tabs.showReview()
      }),
    ]
    return () => {
      for (const dispose of disposers) {
        dispose()
      }
    }
  }
}
